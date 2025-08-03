import { DetailedFileChange } from './git';
import { Part } from '@google/generative-ai';
import {
  ReviewComment,
  ReviewFile,
  StructuredReview,
} from './models/review';
import { basename } from 'path';

export class PromptBuilder {
  constructor(
    private userPrompt: string,
    private styleGuide: string,
    private detailedDiff: DetailedFileChange[],
    private reviewLevel: 'line' | 'file',
    private prTitle: string,
    private prBody: string
  ) {
    if (!userPrompt || !styleGuide) {
      throw new Error('userPrompt and styleGuide cannot be empty');
    }
    if (!['line', 'file'].includes(reviewLevel)) {
      throw new Error('reviewLevel must be either "line" or "file"');
    }
    if (!detailedDiff.length) {
      throw new Error('detailedDiff must be a non-empty array');
    }
  }

  private escapeCode(code: string): string {
    // Escape backticks so we can safely wrap code in markdown
    return code.replace(/`/g, '\\`');
  }

  public build(): (string | Part)[] {
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

    const preamble = `
You are a senior software engineer performing a code review.
Provide **only** structured feedback in JSON following the given schema.
Do **not** reprint the full original or modified code blocks—use them only to inform your comments.

You will be given, for each file:
- filePath: path to the file.
- oldContent: full file content before the change.
- newContent: full file content after the change.
- fileDiff: a unified diff between oldContent and newContent.
- changedLines: list of changed line numbers in the new file.

Use **only** fileDiff to identify changes.
Use oldContent/newContent only to verify correctness.

Return JSON matching this schema exactly (no extra fields, no markdown):
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

    // Map DetailedFileChange into prompt objects
    const fileObjects = this.detailedDiff
      .sort((a, b) => a.filePath.localeCompare(b.filePath))
      .map(f => ({
        file_path: f.filePath,
        file_name: basename(f.filePath),
        change_status: f.status,
        old_content: f.oldContent || '',
        new_content: f.newContent || '',
        diff: f.fileDiff || '',
      }));

    const filesSection: Part = {
      inlineData: {
        mimeType: 'application/json',
        data: Buffer.from(JSON.stringify({ files_to_review: fileObjects })).toString('base64')
      }
    };

    return [
      preamble,
      prContext,
      userContext,
      'Please review the following files:',
      filesSection
    ];
  }
}
