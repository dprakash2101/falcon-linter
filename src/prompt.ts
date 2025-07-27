import { DetailedFileChange } from './git';

export interface ReviewComment {
  line?: number;
  currentCode: string;
  suggestedCode: string;
  reason: string;
  category: 'SECURITY' | 'PERFORMANCE' | 'READABILITY' | 'BUG' | 'DESIGN' | 'REFACTOR' | 'STYLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

export interface ReviewFile {
  filePath: string;
  comments: ReviewComment[];
}

export interface StructuredReview {
  overallSummary: string;
  positiveFeedback: string[];
  files: ReviewFile[];
}

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
    if (!detailedDiff || !Array.isArray(detailedDiff) || detailedDiff.length === 0) {
      throw new Error('detailedDiff must be a non-empty array');
    }
  }

  private escapeCode(code: string): string {
    return code.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  build(): string {
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
    `;

    const preamble = `
      You are a Senior Software Engineer reviewing a pull request (PR) for a junior engineer. Your goal is to provide constructive, educational, and actionable feedback to help them improve their coding skills while ensuring high-quality code.

      **Review Guidelines**:
      - **Context Awareness**: Use the PR title and description to understand the intent and scope of the changes.
      - **Prioritize Impact**: Focus on critical issues (security, performance, bugs) before minor style issues. Limit suggestions to 5 per file to avoid overwhelming feedback.
      - **Concise Feedback**: Provide code snippets (max 5 lines) and explanations (max 100 words) that are clear and actionable.
      - **Educational Tone**: Explain the issue, benefits of the suggestion, and reference the style guide or best practices (e.g., OWASP, Clean Code principles).
      - **Positive Reinforcement**: Include 2-3 specific positive feedback points in 'positiveFeedback' to highlight strengths.
      - **Category and Severity**: Use only the following for 'category': SECURITY, PERFORMANCE, READABILITY, BUG, DESIGN, REFACTOR, STYLE. Use only the following for 'severity': CRITICAL, HIGH, MEDIUM, LOW, INFO.
      - **Structured Output**: Follow the JSON schema exactly, ensuring all fields are populated correctly.

      **JSON Output**:
      - Provide an 'overallSummary' (150 words max) summarizing key changes, strengths, and concerns.
      - Include 'positiveFeedback' with specific praises (2-3 items).
      - List 'files' with targeted comments, using 'line' for line-level feedback when reviewLevel is 'line'.

      **Schema**:
      ${schemaDefinition}
    `;

    const prContext = `
      ## Pull Request Context
      ### Title
      ${this.escapeCode(this.prTitle)}

      ### Description
      ${this.escapeCode(this.prBody)}
    `;

    const userContext = `
      ## User Context
      ### User Prompt
      ${this.escapeCode(this.userPrompt)}

      ### Style Guide
      ${this.escapeCode(this.styleGuide)}
    `;

    const detailedCodeContext = this.detailedDiff.map(file => `
      ## File: ${this.escapeCode(file.filePath)} (Status: ${file.status || 'UNKNOWN'})
      
      ### Old Content
      \`\`\`
      ${this.escapeCode(file.oldContent || '')}
      \`\`\`
      
      ### New Content
      \`\`\`
      ${this.escapeCode(file.newContent || '')}
      \`\`\`
      
      ### Diff
      \`\`\`diff
      ${this.escapeCode(file.fileDiff)}
      \`\`\`
      
      ### Changed Lines
      ${file.changedLines.join(', ')}
    `).join('\n\n');

    return [preamble, prContext, userContext, detailedCodeContext].join('\n\n').trim();
  }
}