import { DetailedFileChange } from './git';

export interface ReviewComment {
  line: number;
  currentCode: string;
  suggestedCode: string;
  reason: string;
}

export interface FileLevelComment {
  currentCode: string; // The exact code snippet to be changed
  suggestedCode: string; // The suggested code improvement
  reason: string; // A detailed explanation of why the change is needed. Explain the benefits (e.g., security, performance, readability, best practices).
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
    private detailedDiff: DetailedFileChange[],
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
        currentCode: string; // The exact code snippet to be changed
        suggestedCode: string; // The suggested code improvement
        reason: string; // A detailed explanation of why the change is needed. Explain the benefits (e.g., security, performance, readability, best practices).
      }

      interface ReviewFile {
        filePath: string; // The path to the file being reviewed
        fileLevelComments: FileLevelComment[];
      }
    `;

    const preamble = `
      You are a Senior Software Engineer performing a code review. Your tone should be helpful, educational, and constructive.
      Your primary goal is to help a junior engineer improve their code by providing clear, actionable, and impactful feedback.

      Focus your review on the most significant issues:
      - Architectural concerns
      - Security vulnerabilities
      - Performance bottlenecks
      - Major readability or maintainability issues
      - Adherence to established best practices and the provided style guide.

      For every suggestion:
      - You MUST provide 'currentCode' and 'suggestedCode'. These code snippets should be concise and directly reflect the change, avoiding large code blocks.
      - The 'reason' field MUST be highly detailed and comprehensive. Explain the 'why' behind the suggestion, including:
          - The specific problem the current code creates.
          - The benefits of your suggested change (e.g., improved security, performance, readability, maintainability, scalability).
          - The underlying engineering principles or best practices that support your suggestion.
          - Potential negative consequences of NOT making the change.

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

    const detailedCodeContext = this.detailedDiff.map(file => `
--- File: ${file.filePath} ---

--- Old Content ---
```
${file.oldContent}
```

--- New Content ---
```
${file.newContent}
```

--- Diff ---
```diff
${file.fileDiff}
```
`).join('\n');

    return `${preamble}
${userContext}
${detailedCodeContext}`;
  }
}
