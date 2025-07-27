import { getDiff, globFiles, getDetailedDiff, DetailedFileChange } from './git';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './providers/types';
import { PromptBuilder, StructuredReview, ReviewFile, ReviewComment, FileLevelComment } from './prompt';
import micromatch from 'micromatch';

dotenv.config();

const reviewSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    files: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          filePath: { type: SchemaType.STRING },
          comments: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                line: { type: SchemaType.NUMBER },
                currentCode: { type: SchemaType.STRING },
                suggestedCode: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
              },
              required: ['line', 'currentCode', 'suggestedCode', 'reason'],
            },
          },
          fileLevelComments: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                currentCode: { type: SchemaType.STRING },
                suggestedCode: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
              },
              required: ['currentCode', 'suggestedCode', 'reason'],
            },
          },
        },
        required: ['filePath'],
      },
    },
  },
  required: ['files'],
} as const;

function formatReviewToMarkdown(review: StructuredReview, reviewLevel: 'line' | 'file'): string {
  const parts: string[] = ['# AI Senior Engineer Code Review'];

  if (!review || !Array.isArray(review.files) || review.files.length === 0) {
    console.log('No valid files found in review.');
    return '';
  }

  review.files.forEach((file: ReviewFile) => {
    if (typeof file !== 'object' || file === null || typeof file.filePath !== 'string') {
      console.log(`Invalid file structure for filePath: ${file?.filePath || 'unknown'}`);
      return;
    }

    const fileComments: string[] = [];

    if (reviewLevel === 'line' && Array.isArray(file.comments)) {
      file.comments.forEach((comment: ReviewComment) => {
        if (
          typeof comment !== 'object' ||
          comment === null ||
          typeof comment.line !== 'number' ||
          typeof comment.currentCode !== 'string' ||
          typeof comment.suggestedCode !== 'string' ||
          typeof comment.reason !== 'string'
        ) {
          console.log(`Invalid comment structure for file: ${file.filePath}`);
          return;
        }

        fileComments.push(`### Suggestion for line ${comment.line}\n`);
        fileComments.push('**Reason:**');
        fileComments.push(comment.reason);
        fileComments.push('\n```diff');
        fileComments.push(`- ${comment.currentCode}`);
        fileComments.push(`+ ${comment.suggestedCode}`);
        fileComments.push('```\n');
      });
    }

    if (reviewLevel === 'file' && Array.isArray(file.fileLevelComments)) {
      file.fileLevelComments.forEach((comment: FileLevelComment) => {
        if (
          typeof comment !== 'object' ||
          comment === null ||
          typeof comment.currentCode !== 'string' ||
          typeof comment.suggestedCode !== 'string' ||
          typeof comment.reason !== 'string'
        ) {
          console.log(`Invalid file-level comment structure for file: ${file.filePath}`);
          return;
        }

        fileComments.push('### File-Level Suggestion\n');
        fileComments.push('**Reason:**');
        fileComments.push(comment.reason);
        fileComments.push('\n```diff');
        fileComments.push(`- ${comment.currentCode}`);
        fileComments.push(`+ ${comment.suggestedCode}`);
        fileComments.push('```\n');
      });
    }

    if (fileComments.length > 0) {
      parts.push(`
---

## `${file.filePath}`
`);
      parts.push(...fileComments);
    }
  });

  if (parts.length === 1) {
    console.log('No valid suggestions to format.');
    return '';
  }

  return parts.join('\n');
}

export async function review(
  provider: GitProvider,
  prompt: string,
  styleGuide: string,
  baseBranch: string,
  modelName: string,
  ignoreFiles: string[],
  reviewLevel: 'line' | 'file'
): Promise<void> {
  console.log(`Getting detailed diff from ${baseBranch}...`);
  const detailedDiff = getDetailedDiff(baseBranch);

  if (detailedDiff.length === 0) {
    console.log('No changes found.');
    return;
  }

  const filteredDetailedDiff = detailedDiff.filter(file => {
    return !micromatch.isMatch(file.filePath, ignoreFiles);
  });

  if (filteredDetailedDiff.length === 0) {
    console.log('No changes found after filtering ignored files.');
    return;
  }

  console.log('Detailed diff retrieved successfully.');

  console.log('Building prompt...');
  const promptBuilder = new PromptBuilder(prompt, styleGuide, filteredDetailedDiff, reviewLevel);
  const finalPrompt = promptBuilder.build();
  console.log('Prompt built successfully.');
  console.log(finalPrompt);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: reviewSchema,
    },
  });

  console.log(`Generating review from the Senior Engineer using ${modelName}...`);

  try {
    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    console.log('Review generated successfully.');
    console.log(response.text());
    
    const structuredReview = JSON.parse(response.text()) as StructuredReview;
    const markdownReview = formatReviewToMarkdown(structuredReview, reviewLevel);

    if (markdownReview.length === 0) {
      console.log('AI review completed. No suggestions to post.');
      return;
    }

    console.log('Posting review...');
    await provider.postReview(markdownReview);
    console.log('Review posted successfully.');
  } catch (error) {
    console.error('Error generating or parsing review:', error);
  }
}