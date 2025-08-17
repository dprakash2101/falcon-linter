import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './models/provider';
import { PromptBuilder } from './prompt';
import { StructuredReview } from './models/review';
import micromatch from 'micromatch';
import { LinterMetadata } from './models/metadata';
import { DetailedFileChange } from './models/diff';

dotenv.config();

export interface FileReviewContext extends DetailedFileChange {
  fullContent: string;
}

// The schema for the structured review JSON output
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
                category: { type: SchemaType.STRING },
                severity: { type: SchemaType.STRING },
              },
              required: ['currentCode', 'reason', 'category', 'severity'],
            },
          },
        },
        required: ['filePath', 'comments'],
      },
    },
  },
  required: ['overallSummary', 'positiveFeedback', 'files'],
};

async function getFullReviewContext(provider: GitProvider, ignoreFiles: string[]): Promise<{ changedFiles: FileReviewContext[], relatedFiles: Map<string, string> }> {
  console.log('Getting detailed diff...');
  const diffContent = await provider.getPullRequestDiff();
  const detailedDiff = getDetailedDiffFromContent(diffContent);
  const { sourceCommit } = await provider.getPullRequestDetails();

  const filteredDiff = detailedDiff.filter(file => !micromatch.isMatch(file.filePath, ignoreFiles));

  console.log('Fetching full content for changed files...');
  const changedFiles: FileReviewContext[] = await Promise.all(
    filteredDiff.map(async (file) => ({
      ...file,
      fullContent: await provider.getFileContent(file.filePath, sourceCommit),
    }))
  );

  // TODO: This part is currently a placeholder. The getRelatedFileContent method in the providers
  // needs a real implementation (e.g., using an AST parser) for this to be effective.
  console.log('Fetching content for related files (placeholder)... ');
  const relatedFiles = new Map<string, string>();
  // for (const file of changedFiles) {
  //   const related = await provider.getRelatedFileContent(file.filePath);
  //   related.forEach((content, path) => relatedFiles.set(path, content));
  // }

  return { changedFiles, relatedFiles };
}

export async function runReview(
  provider: GitProvider,
  userPrompt: string,
  modelName: string,
  ignoreFiles: string[],
) {
  console.log(`Starting review with model: ${modelName}`);
  const metadata = await provider.getMetadata();
  const { title, body, owner, repo, sourceCommit } = await provider.getPullRequestDetails();
  const { changedFiles, relatedFiles } = await getFullReviewContext(provider, ignoreFiles);

  if (changedFiles.length === 0) {
    console.log('No changes found to review after filtering.');
    return;
  }

  console.log('Building intelligent review prompt...');
  const promptBuilder = new PromptBuilder(metadata, title, body, changedFiles, relatedFiles);
  const finalPrompt = promptBuilder.buildReviewPrompt(userPrompt);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: reviewSchema,
    },
  });

  console.log('Generating structured review... This may take a few moments.');
  const result = await model.generateContent(finalPrompt);
  const structuredReview = JSON.parse(result.response.text()) as StructuredReview;
  
  console.log('Formatting review to markdown...');
  const markdownReview = formatReviewToMarkdown(structuredReview, owner, repo, sourceCommit);

  if (!markdownReview.trim()) {
    console.log('Generated review was empty.');
    return;
  }

  await provider.postReview(markdownReview);
}

export async function runSummary(
  provider: GitProvider,
  userPrompt: string,
  modelName: string,
  updateBody: boolean
) {
  console.log(`Starting summary with model: ${modelName}`);
  const metadata = await provider.getMetadata();
  const { title, body } = await provider.getPullRequestDetails();
  const diffContent = await provider.getPullRequestDiff();
  const detailedDiff = getDetailedDiffFromContent(diffContent);
  const fileContexts = detailedDiff.map(d => ({ ...d, fullContent: '' }));

  if (fileContexts.length === 0) {
    console.log('No changes found to summarize.');
    return;
  }

  console.log('Building semantic summary prompt...');
  const promptBuilder = new PromptBuilder(metadata, title, body, fileContexts, new Map());
  const finalPrompt = promptBuilder.buildSummaryPrompt(userPrompt);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: modelName });

  console.log('Generating summary...');
  const result = await model.generateContent(finalPrompt);
  const summaryText = result.response.text();

  if (!summaryText.trim()) {
    console.log('Generated summary was empty.');
    return;
  }

  if (updateBody) {
    console.log('Updating PR body with summary...');
    const newBody = body ? `${body}\n\n---\n**AI Summary:**\n${summaryText}` : `**AI Summary:**\n${summaryText}`;
    await provider.updatePullRequestBody(newBody);
  } else {
    await provider.postReview(summaryText);
  }
}

function formatReviewToMarkdown(review: StructuredReview, owner: string, repo: string, commitHash: string): string {
  const parts: string[] = ['### Falcon AI Review\n'];
  parts.push(`**Overall Summary:** ${review.overallSummary}`);
  if(review.positiveFeedback && review.positiveFeedback.length > 0){
    parts.push(`\n**Positive Feedback:**`);
    review.positiveFeedback.forEach(feedback => { parts.push(`- ${feedback}`); });
  }
  parts.push('\n**Suggestions:**');
  review.files.forEach(file => {
    if (file.comments.length === 0) return;
    parts.push(`\n---\n\n**File:** ${file.filePath}`);
    file.comments.forEach(comment => {
      const permalink = `https://github.com/${owner}/${repo}/blob/${commitHash}/${file.filePath}#L${comment.line}`;
      parts.push(`\n*   **[Line ${comment.line}](${permalink})** [${comment.severity} - ${comment.category}]`);
      parts.push(`    **Reason:** ${comment.reason}`);
      if (comment.suggestedCode) {
        parts.push('    **Suggestion:**\n    ```suggestion');
        parts.push(comment.suggestedCode);
        parts.push('    ```');
      }
    });
  });
  return parts.join('\n');
}

function getDetailedDiffFromContent(diffContent: string): DetailedFileChange[] {
  const files = diffContent.split('diff --git ');
  const detailedChanges: DetailedFileChange[] = [];

  for (const file of files) {
    if (!file.trim()) continue;

    const lines = file.split('\n');
    const filePathLine = lines[0];
    const filePathMatch = filePathLine.match(/^a\/(.+) b\/(.+)$/);
    if (!filePathMatch) continue;

    const filePath = filePathMatch[2];
    detailedChanges.push({ filePath, fileDiff: file });
  }

  return detailedChanges;
}
