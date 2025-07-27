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
  files: ReviewFile[];
}

export class PromptBuilder {
  constructor(
    private userPrompt: string,
    private styleGuide: string,
    private detailedDiff: DetailedFileChange[],
    private reviewLevel: 'line' | 'file'
  ) {
    // Validate inputs
    if (!userPrompt || !styleGuide) {
      throw new Error('userPrompt and styleGuide cannot be empty');
    }
    if (!['line', 'file'].includes(reviewLevel)) {
      throw new Error('reviewLevel must be either "line" or "file"');
    }
    if (!detailedDiff || !Array.isArray(detailedDiff)) {
      throw new Error('detailedDiff must be a non-empty array');
    }
  }

  private escapeCode(code: string): string {
    // Escape special characters to prevent breaking code blocks
    return code
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
      .replace(/\n/g, '\n');
  }

  build(): string {
    // Define the JSON schema once, using the existing interfaces
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
        files: ReviewFile[];
      }
    `;

    const preamble = `
      You are a Senior Software Engineer performing a code review. Your tone should be helpful, educational, and constructive.
      Your primary goal is to help a junior engineer improve their code by providing clear, actionable, and impactful feedback.

      **Review Guidelines**:
      - Focus on significant issues first, prioritizing:
        - Architectural concerns and design patterns
        - Security vulnerabilities and best practices
        - Performance bottlenecks and efficiency improvements
        - Major readability, maintainability, and code clarity issues
        - Adherence to established best practices and the provided style guide
      - For each suggestion:
        - Provide concise 'currentCode' and 'suggestedCode' snippets
        - Include a detailed 'reason' explaining the problem, benefits of the change, and relevant engineering principles
        - Specify a 'category' (SECURITY, PERFORMANCE, READABILITY, BUG, DESIGN, REFACTOR, STYLE)
        - Assign a 'severity' (CRITICAL, HIGH, MEDIUM, LOW, INFO)
      - Provide a comprehensive 'overallSummary' of the pull request
      - Consolidate related feedback to avoid redundancy
      - Ensure JSON output conforms to the defined interfaces

      JSON Schema:
      ${schemaDefinition}
    `;

    const userContext = `
      ## User Context
      ### User Prompt
      ${this.escapeCode(this.userPrompt)}

      ### Style Guide
      ${this.escapeCode(this.styleGuide)}
    `;

    const detailedCodeContext = this.detailedDiff.length > 0
      ? this.detailedDiff.map(file => {
          if (!file.filePath || !file.fileDiff) {
            return ''; // Skip invalid file entries
          }
          return `
      ## File Review: ${this.escapeCode(file.filePath)} (Status: ${file.status || 'UNKNOWN'})
      
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
      `;
        }).filter(Boolean).join('\n\n')
      : `
      ## No File Changes
      No file changes were provided for review.
      `;

    return [preamble, userContext, detailedCodeContext]
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
}