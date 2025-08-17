import { DetailedFileChange } from './git';
import { ReviewComment, ReviewFile, StructuredReview } from './models/review';
import { basename } from 'path';

/**
 * Builds a prompt for code review based on provided changes, user prompt, and style guide.
 * Generates structured JSON output for use with AI code review tools.
 */
export class PromptBuilder {
  /**
   * Creates a PromptBuilder instance.
   * @param userPrompt - The user's specific instructions for the review.
   * @param styleGuide - The style guide to enforce during the review.
   * @param detailedDiff - Array of file changes to review.
   * @param reviewLevel - The level of review ('line' for specific lines or 'file' for overall file changes).
   * @param prTitle - The title of the pull request.
   * @param prBody - The description of the pull request.
   * @throws Error if inputs are invalid or empty.
   */
  constructor(
    private userPrompt: string,
    private styleGuide: string,
    private detailedDiff: DetailedFileChange[],
    private reviewLevel: 'line' | 'file',
    private prTitle: string,
    private prBody: string,
    private commitHistory: string,
    private labels: string[],
    private relatedIssues: string[],
    private author: string
  ) {
    if (!userPrompt?.trim()) {
      throw new Error('userPrompt cannot be empty or whitespace');
    }
    if (!styleGuide?.trim()) {
      throw new Error('styleGuide cannot be empty or whitespace');
    }
    if (!prTitle?.trim()) {
      throw new Error('prTitle cannot be empty or whitespace');
    }
    if (!['line', 'file'].includes(reviewLevel)) {
      throw new Error('reviewLevel must be either "line" or "file"');
    }
    if (!detailedDiff?.length) {
      throw new Error('detailedDiff must be a non-empty array');
    }
  }

  /**
   * Escapes special characters in code for safe inclusion in markdown or JSON.
   * @param code - The code string to escape.
   * @returns The escaped code string.
   */
  private escapeCode(code: string): string {
    return (code || '')
      .replace(/`/g, '\`')
      .replace(/"/g, '\"')
      .replace(/\n/g, '\n')
      .replace(/\r/g, '\r')
      .replace(/\t/g, '\t');
  }

  /**
   * Calculates the number of added and deleted lines from the diff.
   * @returns An object with the count of added and deleted lines.
   */
  private getChangeStats(): { added: number; deleted: number } {
    let added = 0;
    let deleted = 0;

    for (const file of this.detailedDiff) {
      const lines = (file.fileDiff || '').split('\n');
      for (const line of lines) {
        if (line.startsWith('+')) {
          added++;
        } else if (line.startsWith('-')) {
          deleted++;
        }
      }
    }

    return { added, deleted };
  }

  /**
   * Builds the prompt as an array of strings for code review.
   * @returns An array of strings representing the prompt components.
   */
  public build(): string[] {
    const schemaDefinition = `
interface ReviewComment {
  line?: number;
  currentCode: string;
  suggestedCode: string;
  reason: string;
  category: 'CRITICAL' | 'IMPROVEMENT' | 'STYLE' | 'QUESTION' | 'PRAISE' | 'LEARNING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

interface ReviewFile {
  filePath: string;
  comments: ReviewComment[];
}

interface StructuredReview {
  overallSummary: string;
  positiveFeedback: string[];
  files: ReviewFile[];
}
`.trim();

    const reviewLevelInstruction = this.reviewLevel === 'line'
      ? 'Provide line-level comments focusing on specific changed lines in the diff. Include the exact line number from newContent in the `line` field.'
      : 'Provide file-level comments focusing on the overall changes in each file. Do not include the `line` field in comments.';

    const authorExperience = this.author.toLowerCase().includes('new') || this.author.toLowerCase().includes('junior') 
      ? 'junior' 
      : 'senior';

    const personaCue = authorExperience === 'junior'
      ? 'The author of this PR is a junior developer. Please provide more detailed explanations and be encouraging. Focus on providing learning opportunities.' 
      : 'The author of this prism is a senior developer. You can be more direct and concise in your feedback. Focus on high-level architectural improvements.';

    const preamble = `
You are a senior software engineer and an expert in the tech stack of this project. Your name is Falcon Linter, and you are a code reviewer with a keen eye for detail and a passion for helping developers write better code. You are friendly, constructive, and always provide clear and actionable feedback.

${personaCue}

You are reviewing a pull request. Provide **only** structured feedback in JSON following the given schema.
Do **not** review or include unmodified code—focus exclusively on the changes in \`fileDiff\`.
Use \`newContent\` only to understand the context of the changes and extract the current code for the \`currentCode\` field.

**Review Level**: ${this.reviewLevel}
${reviewLevelInstruction}

**Instructions:**
1.  Review the code changes in the provided \`fileDiff\` for each file.
2.  Use \`newContent\` to extract the current state of changed lines or files for the \`currentCode\` field.
3.  Focus **only** on the changes introduced in \`fileDiff\`. Ignore any unchanged code.
4.  For each comment, the \`currentCode\` field **must** reflect the code from the *new version* of the file in \`newContent\`.
5.  Provide suggestions for improvement based on the user's prompt and style guide.
6.  Ensure comments align with the specified review level (${this.reviewLevel}).
7.  Be encouraging and provide positive feedback for good practices in the \`positiveFeedback\` field.
8.  Use the 'LEARNING' category to provide educational explanations about the code.
9.  Do not include markdown or extra fields in the JSON output.

Return JSON matching this schema exactly:
${schemaDefinition}
`.trim();

    const changeStats = this.getChangeStats();
    const prContext = `
Pull Request Title:
${this.escapeCode(this.prTitle)}

Pull Request Description:
${this.escapeCode(this.prBody)}

Change Size:
- Lines Added: ${changeStats.added}
- Lines Deleted: ${changeStats.deleted}

Commit History:
${this.commitHistory}

PR Labels:
${this.labels.join(', ')}

Related Issues:
${this.relatedIssues.join(', ')}
`.trim();

    const userContext = `
User Prompt:
${this.escapeCode(this.userPrompt)}

Style Guide:
${this.escapeCode(this.styleGuide)}

Team Standards:


Ticket Context:

`.trim();

    // Map DetailedFileChange into prompt objects, sorting by filePath for consistent output
    const fileObjects = this.detailedDiff
      .sort((a, b) => (a.filePath || '').localeCompare(b.filePath || ''))
      .map(f => ({
        file_path: f.filePath || '',
        file_name: f.filePath ? basename(f.filePath) : 'unknown',
        change_status: f.status || 'unknown',
        new_content: f.newContent || '',
        diff: f.fileDiff || '',
      }));

    let filesToReview: string;
    try {
      filesToReview = JSON.stringify({ files_to_review: fileObjects }, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize file objects: ${(error as Error).message}`);
    }

    return [
      preamble,
      prContext,
      userContext,
      'Please review the following files:',
      filesToReview,
    ];
  }
}