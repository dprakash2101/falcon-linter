import { getDetailedDiff, DetailedFileChange, getCommitHistory, getLatestCommitHash } from './git';
import {
  GoogleGenerativeAI,
  SchemaType,
  Schema,
  Part,
} from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './models/provider';
import { PromptBuilder } from './prompt';
import {
  StructuredReview,
  ReviewFile,
  ReviewComment,
} from './models/review';
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
                suggestedCode: { type: SchemaType.STRING, nullable: true },
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

function formatReviewToMarkdown(review: StructuredReview, owner: string, repo: string, commitHash: string, outputBlocks: string[], detailedDiff: DetailedFileChange[]): string {
  const parts: string[] = ['# Falcon PR Reviewer'];

  const actionableItems = review.files.flatMap(file => 
    file.comments
      .filter(comment => comment.severity === 'CRITICAL' || comment.severity === 'HIGH')
      .map(comment => ({
        filePath: file.filePath,
        line: comment.line,
        reason: comment.reason,
      }))
  );

  if (outputBlocks.includes('actionableItems') && actionableItems.length > 0) {
    parts.push(`
## Actionable Items

| File | Line | Suggestion |
| --- | --- | --- |`);
    for (const item of actionableItems) {
      parts.push(`| ${item.filePath} | ${item.line || 'N/A'} | ${item.reason} |`);
    }
  }

  if (outputBlocks.includes('overallSummary')) {
    parts.push(`
## Overall Summary
${review.overallSummary}`);
  }

  if (outputBlocks.includes('positiveFeedback') && review.positiveFeedback.length > 0) {
    parts.push(`
## Positive Feedback
`);
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

  if (outputBlocks.includes('suggestionSummary') && Object.keys(categoryCounts).length > 0) {
    parts.push(`
## Suggestion Summary
`);
    for (const category in categoryCounts) {
      const severities = categoryCounts[category];
      const severityStr = Object.entries(severities)
        .map(([sev, count]) => `${count} ${sev}`)
        .join(', ');
      parts.push(`- **${category}**: ${severityStr}`);
    }
  }

  if (outputBlocks.includes('fileDetails')) {
    review.files.forEach(file => {
      if (file.comments.length === 0) return;
      parts.push(`
---

## eactivex
`);
      file.comments.forEach(comment => {
        const permalink = `https://github.com/${owner}/${repo}/blob/${commitHash}/${file.filePath}#L${comment.line}`;
        parts.push(comment.line ? `### [Line ${comment.line}](${permalink})` : '### File-Level Suggestion');
        parts.push(`**Category:** ${comment.category} | **Severity:** ${comment.severity}\n`);
        parts.push('**Reason:**');
        parts.push(comment.reason);

        const docLinks = {
          'STYLE': 'https://google.github.io/styleguide/tsguide.html',
          'SECURITY': 'https://github.com/OWASP/CheatSheetSeries/blob/master/Index.md'
        };

        if (docLinks[comment.category]) {
          parts.push(`
*Further reading: [${docLinks[comment.category]}](${docLinks[comment.category]})*`);
        }

        parts.push('\n**Current Code:**\n```');
        parts.push(comment.currentCode);
        parts.push('```');
        parts.push('\n**Suggested Code:**\n```');
        parts.push(comment.suggestedCode);
        parts.push('```');
      });
    });
  }

  if (outputBlocks.includes('qualityScore')) {
    const totalComments = review.files.reduce((acc, file) => acc + file.comments.length, 0);
    const criticalComments = review.files.reduce((acc, file) => acc + file.comments.filter(c => c.severity === 'CRITICAL').length, 0);
    const highComments = review.files.reduce((acc, file) => acc + file.comments.filter(c => c.severity === 'HIGH').length, 0);
    const changeStats = detailedDiff.reduce((acc, file) => {
      const lines = (file.fileDiff || '').split('\n');
      acc.added += lines.filter(line => line.startsWith('+')).length;
      acc.deleted += lines.filter(line => line.startsWith('-')).length;
      return acc;
    }, { added: 0, deleted: 0 });
    const totalChanges = changeStats.added + changeStats.deleted;

    const score = totalComments > 0 ? (1 - (criticalComments + highComments) / totalComments) * 100 : 100;

    parts.push(`
## PR Quality Score: ${score.toFixed(2)}/100
`);
  }


  return parts.join('\n');
}

export async function review(
  provider: GitProvider,
  prompt: string,
  styleGuide: string,
  modelName: string,
  ignoreFiles: string[],
  reviewLevel: 'line' | 'file',
  outputBlocks: string[]
): Promise<void> {
  console.log(`Starting review with level: ${reviewLevel}`);
  console.log('Fetching PR details...');
  const { title: prTitle, body: prBody, baseBranch, labels, relatedIssues, author, owner, repo } = await provider.getPullRequestDetails();

  if (!baseBranch) {
    console.error('Failed to fetch base branch from PR details.');
    return;
  }

  console.log(`Getting detailed diff from ${baseBranch}...`);
  const detailedDiff = getDetailedDiff(baseBranch);
  const commitHistory = getCommitHistory(baseBranch);

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
  const promptBuilder = new PromptBuilder(prompt, styleGuide, filteredDetailedDiff, reviewLevel, prTitle, prBody, commitHistory, labels, relatedIssues, author);
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
    
    const commitHash = getLatestCommitHash();
    const markdownReview = formatReviewToMarkdown(structuredReview, owner, repo, commitHash, outputBlocks, filteredDetailedDiff);
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