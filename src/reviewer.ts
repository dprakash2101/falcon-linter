import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { GitProvider } from './models/provider';
import { PromptBuilder } from './prompt';
import { StructuredReview } from './models/review';
import micromatch from 'micromatch';
import { LinterMetadata } from './models/metadata';
import { DetailedFileChange } from './models/diff';
import { log, error } from './logger';

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

async function getFullReviewContext(provider: GitProvider, ignoreFiles: string[], metadata: LinterMetadata): Promise<{ changedFiles: FileReviewContext[], relatedFiles: Map<string, string> }> {
  log('Getting detailed diff...');
  const diffContent = await provider.getPullRequestDiff();
  const detailedDiff = getDetailedDiffFromContent(diffContent);
  const { sourceCommit, baseBranch } = await provider.getPullRequestDetails(); // Get baseBranch here

  let finalIgnoreFiles = [...ignoreFiles]; // Start with existing ignoreFiles
  if (metadata.ignoredExtensions && metadata.ignoredExtensions.length > 0) {
    const extensionGlobs = metadata.ignoredExtensions.map(ext => `**/*.${ext}`);
    finalIgnoreFiles = [...finalIgnoreFiles, ...extensionGlobs];
  }

  const filteredDiff = detailedDiff.filter(file => !micromatch.isMatch(file.filePath, finalIgnoreFiles));

  log('Fetching full content for changed files...');
  const changedFiles: FileReviewContext[] = await Promise.all(
    filteredDiff.map(async (file) => {
      if (file.status === 'deleted') {
        return {
          ...file,
          fullContent: '', // Skip fetching content for deleted files
        };
      }
      let contentRef = sourceCommit; // Default to sourceCommit
      return {
        ...file,
        fullContent: await provider.getFileContent(file.filePath, contentRef),
      };
    })
  );

  // TODO: This part is currently a placeholder. The getRelatedFileContent method in the providers
  // needs a real implementation (e.g., using an AST parser) for this to be effective.
  log('Fetching content for related files (placeholder)... ');
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
  log(`Starting review with model: ${modelName}`);
  const { title, body, owner, repo, sourceCommit, sourceBranch } = await provider.getPullRequestDetails();
  const metadata = await provider.getMetadata(sourceBranch);
  const { changedFiles, relatedFiles } = await getFullReviewContext(provider, ignoreFiles, metadata);

  if (changedFiles.length === 0) {
    log('No changes found to review after filtering.');
    return;
  }

  log('Building intelligent review prompt...');
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

  log('Generating structured review... This may take a few moments.');
  const result = await model.generateContent(finalPrompt);
  const structuredReview = JSON.parse(result.response.text()) as StructuredReview;
  
  log('Formatting review to markdown...');
  const markdownReview = formatReviewToMarkdown(structuredReview, owner, repo, sourceCommit);

  if (!markdownReview.trim()) {
    log('Generated review was empty.');
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
  log(`Starting summary with model: ${modelName}`);
  const { title, body, sourceBranch } = await provider.getPullRequestDetails();
  const metadata = await provider.getMetadata(sourceBranch);
  const { changedFiles } = await getFullReviewContext(provider, [], metadata);

  if (changedFiles.length === 0) {
    log('No changes found to summarize.');
    return;
  }

  log('Building semantic summary prompt...');
  const promptBuilder = new PromptBuilder(metadata, title, body, changedFiles, new Map());
  const finalPrompt = promptBuilder.buildSummaryPrompt(userPrompt);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: modelName });

  log('Generating summary...');
  const result = await model.generateContent(finalPrompt);
  const summaryText = result.response.text();

  if (!summaryText.trim()) {
    log('Generated summary was empty.');
    return;
  }

  if (updateBody) {
    log('Updating PR body with summary...');
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

    let filePath = '';
    let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'; // Default to modified

    if (filePathMatch) {
      const oldPath = filePathMatch[1];
      const newPath = filePathMatch[2];

      if (oldPath === '/dev/null') {
        filePath = newPath;
        status = 'added';
      } else if (newPath === '/dev/null') {
        filePath = oldPath;
        status = 'deleted';
      } else {
        filePath = newPath;
        // Check for rename
        if (file.includes('rename from') && file.includes('rename to')) {
          status = 'renamed';
        }
      }
    } else {
      // Handle cases where filePathMatch doesn't work, e.g., binary files or malformed diffs
      // For now, we'll skip these or assign a default status if necessary.
      continue;
    }

    detailedChanges.push({ filePath, fileDiff: file, status });
  }

  return detailedChanges;
}
