import { getDetailedDiff, DetailedFileChange } from './git';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './providers/types';
import { PromptBuilder, StructuredReview, ReviewFile, ReviewComment } from './prompt';
import micromatch from 'micromatch';

dotenv.config();

const reviewSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overallSummary: { type: SchemaType.STRING },
    positiveFeedback: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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
                line: { type: SchemaType.NUMBER, nullable: true },
                currentCode: { type: SchemaType.STRING },
                suggestedCode: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
                category: { type: SchemaType.STRING }, // Enforced via prompt
                severity: { type: SchemaType.STRING }, // Enforced via prompt
              },
              required: ['currentCode', 'suggestedCode', 'reason', 'category', 'severity'],
            },
          },
        },
        required: ['filePath', 'comments'],
      },
    },
  },
  required: ['overallSummary', 'positiveFeedback', 'files'],
} as const;

function formatReviewToMarkdown(review: StructuredReview): string {
  const parts: string[] = ['# AI Senior Engineer Code Review'];

  parts.push(`\n## Overall Summary\n${review.overallSummary}`);

  if (review.positiveFeedback.length > 0) {
    parts.push(`\n## Positive Feedback\n`);
    parts.push(...review.positiveFeedback.map(feedback => `- ${feedback}`));
  }

  const categoryCounts: Record<string, Record<string, number>> = {};
  review.files.forEach(file => {
    file.comments.forEach(comment => {
      const category = comment.category;
      const severity = comment.severity;
      if (!categoryCounts[category]) categoryCounts[category] = {};
      if (!categoryCounts[category][severity]) categoryCounts[category][severity] = 0;
      categoryCounts[category][severity]++;
    });
  });

  if (Object.keys(categoryCounts).length > 0) {
    parts.push(`\n## Suggestion Summary\n`);
    for (const category in categoryCounts) {
      const severities = categoryCounts[category];
      const severityStr = Object.entries(severities)
        .map(([sev, count]) => `${count} ${sev}`)
        .join(', ');
      parts.push(`- **${category}**: ${severityStr}`);
    }
  }

  review.files.forEach(file => {
    if (file.comments.length === 0) return;
    parts.push(`\n---\n\n## \`${file.filePath}\`\n`);
    file.comments.forEach(comment => {
      parts.push(comment.line ? `### Line ${comment.line}` : '### File-Level Suggestion');
      parts.push(`**Category:** ${comment.category} | **Severity:** ${comment.severity}\n`);
      parts.push('**Reason:**');
      parts.push(comment.reason);
      parts.push('\n```diff');
      const currentLines = comment.currentCode.split('\n').map(line => `- ${line.trim()}`);
      const suggestedLines = comment.suggestedCode.split('\n').map(line => `+ ${line.trim()}`);
      parts.push(...currentLines, ...suggestedLines);
      parts.push('```');
    });
  });

  return parts.join('\n');
}

export async function review(
  provider: GitProvider,
  prompt: string,
  styleGuide: string,
  modelName: string,
  ignoreFiles: string[],
  reviewLevel: 'line' | 'file'
): Promise<void> {
  console.log(`Starting review with level: ${reviewLevel}`);
  console.log('Fetching PR details...');
  const { title: prTitle, body: prBody, baseBranch } = await provider.getPullRequestDetails();

  if (!baseBranch) {
    console.error('Failed to fetch base branch from PR details.');
    return;
  }

  console.log(`Getting detailed diff from ${baseBranch}...`);
  const detailedDiff = getDetailedDiff(baseBranch);

  if (detailedDiff.length === 0) {
    console.log('No changes found.');
    return;
  }

  const filteredDetailedDiff = detailedDiff.filter(file => !micromatch.isMatch(file.filePath, ignoreFiles));

  if (filteredDetailedDiff.length === 0) {
    console.log('No changes found after filtering ignored files.');
    return;
  }

  console.log('Detailed diff retrieved successfully.');

  console.log('Building prompt...');
  const promptBuilder = new PromptBuilder(prompt, styleGuide, filteredDetailedDiff, reviewLevel, prTitle, prBody);
  const finalPrompt = promptBuilder.build();
  console.log('Prompt built successfully.');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: reviewSchema,
    },
  });

  console.log(`Generating review using ${modelName}...`);
  try {
    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    console.log('Review generated successfully.');
    
    let structuredReview: StructuredReview;
    try {
      structuredReview = JSON.parse(response.text()) as StructuredReview;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return;
    }
    
    const markdownReview = formatReviewToMarkdown(structuredReview);
    if (!markdownReview) {
      console.log('No suggestions to post.');
      return;
    }

    console.log('Posting review...');
    await provider.postReview(markdownReview);
    console.log('Review posted successfully.');
  } catch (error) {
    console.error('Error during review process:', error);
    throw error;
  }
}