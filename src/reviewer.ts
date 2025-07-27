import { getDiff, globFiles, getDetailedDiff, DetailedFileChange } from './git';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './providers/types';
import { PromptBuilder, StructuredReview, ReviewFile, ReviewComment } from './prompt'; // Removed FileLevelComment
import micromatch from 'micromatch';

dotenv.config();

const reviewSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overallSummary: { type: SchemaType.STRING }, // overallSummary is now mandatory
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
                line: { type: SchemaType.NUMBER }, // line is now optional
                currentCode: { type: SchemaType.STRING },
                suggestedCode: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                category: { type: SchemaType.STRING }, // Added category
              },
              required: ['currentCode', 'suggestedCode', 'reason'], // line is no longer required
            },
          },
        },
        required: ['filePath', 'comments'], // comments array is now required
      },
    },
  },
  required: ['overallSummary', 'files'], // overallSummary is now required
} as const;

function formatReviewToMarkdown(review: StructuredReview, reviewLevel: 'line' | 'file'): string {
  const parts: string[] = ['# AI Senior Engineer Code Review'];

  // Overall Summary is now mandatory
  parts.push(`\n## Overall Summary\n`);
  parts.push(review.overallSummary);

  if (!Array.isArray(review.files) || review.files.length === 0) {
    console.log('No valid files found in review.');
    return parts.join('\n'); // Return summary even if no files
  }

  review.files.forEach((file: ReviewFile) => {
    if (typeof file !== 'object' || file === null || typeof file.filePath !== 'string' || !Array.isArray(file.comments)) {
      console.log(`Invalid file structure for filePath: ${file?.filePath || 'unknown'}`);
      return;
    }

    if (file.comments.length === 0) {
      return;
    }

    parts.push(`\n---\n\n## \`${file.filePath}\`\n`);

    file.comments.forEach((comment: ReviewComment) => {
      if (
        typeof comment !== 'object' ||
        comment === null ||
        typeof comment.currentCode !== 'string' ||
        typeof comment.suggestedCode !== 'string' ||
        typeof comment.reason !== 'string'
      ) {
        console.log(`Invalid comment structure for file: ${file.filePath}`);
        return;
      }

      if (comment.line !== undefined) {
        parts.push(`### Suggestion for line ${comment.line}\n`);
      } else {
        parts.push('### File-Level Suggestion\n');
      }

      if (comment.category) {
        parts.push(`**Category:** ${comment.category}\n`);
      }
      parts.push('**Reason:**');
      parts.push(comment.reason);
      parts.push('\n```diff');
      parts.push(`- ${comment.currentCode}`);
      parts.push(`+ ${comment.suggestedCode}`);
      parts.push('```\n');
    });
  });

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