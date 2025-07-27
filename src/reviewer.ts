import { getDiff } from './git';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './providers/types';
import { PromptBuilder, StructuredReview, ReviewFile } from './prompt';

dotenv.config();

// Define the schema with explicit SchemaType values and `as const` for literal type inference
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
        },
        required: ['filePath', 'comments'],
      },
    },
  },
  required: ['files'],
} as const;

function formatReviewToMarkdown(review: StructuredReview): string {
  const parts: string[] = ['# AI Senior Engineer Code Review'];

  // Check if review and review.files are valid
  if (!review || !Array.isArray(review.files) || review.files.length === 0) {
    console.log('No valid files found in review.');
    return '';
  }

  review.files.forEach((file: ReviewFile) => {
    // Validate file structure
    if (
      typeof file !== 'object' ||
      file === null ||
      typeof file.filePath !== 'string' ||
      !Array.isArray(file.comments)
    ) {
      console.log(`Invalid file structure for filePath: ${file?.filePath || 'unknown'}`);
      return;
    }

    if (file.comments.length === 0) {
      return;
    }

    parts.push(`\n---\n\n## \`${file.filePath}\`\n`);

    file.comments.forEach((comment) => {
      // Validate comment structure
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

      parts.push(`### Suggestion for line ${comment.line}\n`);
      parts.push('**Reason:**');
      parts.push(comment.reason);
      parts.push('\n```diff');
      parts.push(`- ${comment.currentCode}`);
      parts.push(`+ ${comment.suggestedCode}`);
      parts.push('```\n');
    });
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
  modelName: string
): Promise<void> {
  console.log(`Getting diff from ${baseBranch}...`);
  const diff = getDiff(baseBranch);

  if (!diff) {
    console.log('No changes found.');
    return;
  }
  console.log('Diff retrieved successfully.');
  console.log(diff);

  console.log('Building prompt...');
  const promptBuilder = new PromptBuilder(prompt, styleGuide, diff);
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
    const markdownReview = formatReviewToMarkdown(structuredReview);

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