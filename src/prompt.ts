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
    private prBody: string
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
    if (!prBody?.trim()) {
      throw new Error('prBody cannot be empty or whitespace');
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
      .replace(/`/g, '\\`')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
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
  category: 'SECURITY' | 'PERFORMANCE' | 'READABILITY' | 'BUG' | 'DESIGN' | 'REFACTOR' | 'STYLE';
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

    const preamble = `
You are a senior software engineer performing a code review.
Provide **only** structured feedback in JSON following the given schema.
Do **not** review or include unmodified code—focus exclusively on the changes in \`fileDiff\`.
Use \`newContent\` only to understand the context of the changes and extract the current code for the \`currentCode\` field.

**Review Level**: ${this.reviewLevel}
${reviewLevelInstruction}

**Instructions:**
1. Review the code changes in the provided \`fileDiff\` for each file.
2. Use \`newContent\` to extract the current state of changed lines or files for the \`currentCode\` field.
3. Focus **only** on the changes introduced in \`fileDiff\`. Ignore any unchanged code.
4. For each comment, the \`currentCode\` field **must** reflect the code from the *new version* of the file in \`newContent\`.
5. Provide suggestions for improvement based on the user's prompt and style guide.
6. Ensure comments align with the specified review level (${this.reviewLevel}).
7. Do not include markdown or extra fields in the JSON output.

Return JSON matching this schema exactly:
${schemaDefinition}
`.trim();

    const prContext = `
Pull Request Title:
${this.escapeCode(this.prTitle)}

Pull Request Description:
${this.escapeCode(this.prBody)}
`.trim();

    const userContext = `
User Prompt:
${this.escapeCode(this.userPrompt)}

Style Guide:
${this.escapeCode(this.styleGuide)}
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