export interface ReviewComment {
  line: number;
  currentCode: string;
  suggestedCode: string;
  reason: string;
}

export interface FileLevelComment {
  reason: string;
}

export interface ReviewFile {
  filePath: string;
  comments?: ReviewComment[];
  fileLevelComments?: FileLevelComment[];
}

export interface StructuredReview {
  files: ReviewFile[];
}

export class PromptBuilder {
  constructor(
    private userPrompt: string,
    private styleGuide: string,
    private diff: string,
    private reviewLevel: 'line' | 'file'
  ) {}

  build(): string {
    const lineLevelInterface = `
      interface ReviewComment {
        line: number; // The line number where the comment applies
        currentCode: string; // The exact code snippet to be changed
        suggestedCode: string; // The suggested code improvement
        reason: string; // A detailed explanation of why the change is needed. Explain the benefits (e.g., security, performance, readability, best practices).
      }

      interface ReviewFile {
        filePath: string; // The path to the file being reviewed
        comments: ReviewComment[];
      }
    `;

    const fileLevelInterface = `
      interface FileLevelComment {
        reason: string; // A detailed explanation of why the change is needed. Explain the benefits (e.g., security, performance, readability, best practices).
      }

      interface ReviewFile {
        filePath: string; // The path to the file being reviewed
        fileLevelComments: FileLevelComment[];
      }
    `;

    const preamble = `
      You are a Senior Software Engineer performing a code review. Your tone should be helpful, educational, and constructive.
      Your goal is to help a junior engineer improve their code by providing clear, actionable feedback.

      Please review the following code changes and provide your feedback based on the JSON schema provided.

      The JSON object must conform to the following TypeScript interfaces:
      ${this.reviewLevel === 'line' ? lineLevelInterface : fileLevelInterface}

      interface StructuredReview {
        files: ReviewFile[];
      }
    `;

    const userContext = `
      --- User Prompt ---
      ${this.userPrompt}

      --- Style Guide ---
      ${this.styleGuide}
    `;

    const codeDiff = `
      --- Code Diff ---
      ${this.diff}
    `;

    return `${preamble}\n${userContext}\n${codeDiff}`;
  }
}