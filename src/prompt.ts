import { FileReviewContext } from './reviewer';
import { LinterMetadata } from './models/metadata';

export class PromptBuilder {
  private metadata: LinterMetadata;
  private prTitle: string;
  private prBody: string;
  private files: FileReviewContext[];
  private relatedFiles: Map<string, string>;

  constructor(
    metadata: LinterMetadata,
    prTitle: string,
    prBody: string,
    files: FileReviewContext[],
    relatedFiles: Map<string, string>
  ) {
    this.metadata = metadata;
    this.prTitle = prTitle;
    this.prBody = prBody;
    this.files = files;
    this.relatedFiles = relatedFiles;
  }

  private buildPersona(): string {
    const { language, projectType, framework } = this.metadata.projectInfo || {};
    let persona = 'You are a principal-level software engineer with 15+ years of experience';
    if (language) {
      persona += `, specializing in ${language}`;
    }
    if (projectType && framework) {
      persona += ` for ${projectType} applications using ${framework}`;
    }
    persona += '. You are an expert in secure coding practices, scalable architecture, and creating highly maintainable and performant code. Your feedback is always constructive, clear, and educational.';
    return persona;
  }

  public buildReviewPrompt(userPrompt: string): string {
    const persona = this.buildPersona();
    const customReviewPrompt = this.metadata.customPrompts?.review || '';

    const reviewChecklist = `
      Your task is to review a pull request. Provide **only** structured feedback in JSON following the given schema.
      Analyze the code for the following, focusing only on the lines that have been changed:

      1.  **Architecture & Design:** Does the code follow established design patterns? Does it introduce unnecessary complexity or violate SOLID principles? Is it scalable?
      2.  **Security:** Are there any potential security vulnerabilities (e.g., injection, XSS, insecure handling of credentials, sensitive data exposure)?
      3.  **Performance:** Could this code lead to performance issues (e.g., inefficient queries, memory leaks, unnecessary re-renders, slow algorithms)?
      4.  **Error Handling:** Is error handling robust? Are there unhandled edge cases or scenarios that could lead to crashes?
      5.  **Clarity & Maintainability:** Is the code easy to understand? Are variable names clear? Is there sufficient, high-quality documentation where needed? Is the code overly complex (e.g., long methods, deep nesting)?
      6.  **Best Practices:** Does the code adhere to language-specific and framework-specific best practices? Are there any anti-patterns?
      7.  **Breaking Changes:** Based on the provided context of related files, could any of the changes introduce a breaking change for consumers of the modified code?
    `;

    const prContext = `
      Pull Request Title: ${this.prTitle}
      Pull Request Description:
      ${this.prBody}
      List of changed files: ${this.files.map(f => f.filePath).join(', ')}
    `;

    const userContext = `
      The user who triggered this review added the following instructions:
      User's Instructions: ${userPrompt || 'None'}
      The repository's custom review instructions are:
      Repository Instructions: ${customReviewPrompt || 'None'}
    `;

    const filesToReview = this.files.map(f => `
      File: ${f.filePath}
      Diff:
      ${f.fileDiff}
      Full Content:
      ${f.fullContent}
    `).join('\n---\n');

    let relatedFilesContext = 'For additional context, here is the content of potentially related files. Use this to check for breaking changes:\n';
    if (this.relatedFiles.size > 0) {
      for (const [path, content] of this.relatedFiles.entries()) {
        relatedFilesContext += `--- File: ${path} ---
${content}
`;
      }
    } else {
      relatedFilesContext += 'No related files were found for additional context.\n';
    }

    return [
      persona,
      reviewChecklist,
      prContext,
      userContext,
      relatedFilesContext,
      'Please review the following files based on all the instructions and context provided:',
      filesToReview,
    ].join('\n\n');
  }

  public buildSummaryPrompt(userPrompt: string): string {
    const persona = this.buildPersona();
    const customSummaryPrompt = this.metadata.customPrompts?.summary || '';
    const summaryInstructions = `
      Your task is to generate a semantic summary of a pull request based on its title, description, and code changes.
      Do not just list the file changes. Instead, describe the *impact* of the changes.
      What user-facing features were added or changed? What technical debt was addressed? What core behavior was modified?
      The output should be in clean Markdown format.
    `;
    const prContext = `
      Pull Request Title: ${this.prTitle}
      Pull Request Description:
      ${this.prBody}
    `;
    const userContext = `
      The user who triggered this summary added the following notes: ${userPrompt || 'None'}
      The repository's custom summary instructions are: ${customSummaryPrompt || 'None'}
    `;
    const diffs = this.files.map(f => `File: ${f.filePath}\nDiff:\n${f.fileDiff}`).join('\n---\n');
    return [
      persona,
      summaryInstructions,
      prContext,
      userContext,
      'Based on the following diffs, please generate your semantic summary:',
      diffs
    ].join('\n\n');
  }
}