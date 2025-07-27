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
    // Escape triple backticks only to avoid breaking markdown blocks
    return code.replace(/```/g, '\\`\\`\\`');
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
`.trim();

    const preamble = `
You are a **Senior Software Engineer** reviewing a pull request (PR) created by a **Junior Developer**.

### 🎯 Goal
Provide **constructive, actionable, and educational** feedback to improve code quality and developer skills.

### 🧭 Instructions
- **Review Level**: \`${this.reviewLevel.toUpperCase()}\`
- Focus on high-impact issues first: \`SECURITY\`, \`PERFORMANCE\`, and \`BUG\`.
- Max 5 comments per file.
- Feedback must include:
  - \`line\` (optional, if in line mode)
  - \`currentCode\`: problematic code snippet (max 5 lines)
  - \`suggestedCode\`: improved version (max 5 lines)
  - \`reason\`: explanation (max 100 words)
  - \`category\` and \`severity\` as per the schema
- Provide 2–3 specific praises under \`positiveFeedback\`
- Output must conform exactly to the schema below. Do not hallucinate fields or values.

### 📄 JSON Output Schema
${schemaDefinition}
`.trim();

    const prContext = `
## 📝 Pull Request Context

### 🔖 Title
${this.escapeCode(this.prTitle)}

### 🧾 Description
${this.escapeCode(this.prBody)}
`.trim();

    const userContext = `
## 👤 User Input

### 🧠 Prompt
${this.escapeCode(this.userPrompt)}

### 📘 Style Guide
${this.escapeCode(this.styleGuide)}
`.trim();

    const sortedFiles = [...this.detailedDiff].sort((a, b) =>
      a.filePath.localeCompare(b.filePath)
    );

    const detailedCodeContext = sortedFiles.map(file => {
      const sortedLines = [...(file.changedLines || [])].sort((a, b) => a - b);
      return `
## 📂 File: \`${this.escapeCode(file.filePath)}\` (Status: ${file.status || 'UNKNOWN'})

### 🔍 Original Code
\`\`\`ts
${this.escapeCode(file.oldContent || '').trim()}
\`\`\`

### ✏️ Modified Code
\`\`\`ts
${this.escapeCode(file.newContent || '').trim()}
\`\`\`

### 🧾 Diff
\`\`\`diff
${this.escapeCode(file.fileDiff || '').trim()}
\`\`\`

### 📌 Changed Lines
${sortedLines.join(', ') || 'N/A'}
`.trim();
    }).join('\n\n');

    return [
      preamble,
      '',
      prContext,
      '',
      userContext,
      '',
      detailedCodeContext
    ].join('\n\n').trim();
  }
}
