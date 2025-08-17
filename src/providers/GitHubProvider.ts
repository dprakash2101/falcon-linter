import { Octokit } from '@octokit/rest';
import { GitProvider, ProviderOptions } from '../models/provider';
import { LinterMetadata } from '../models/metadata';
import { log, error } from '../logger';

export class GitHubProvider implements GitProvider {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private prNumber: number;

  constructor(prNumber: number, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
  }

  async getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string; sourceCommit: string; sourceBranch: string; labels: string[]; relatedIssues: string[]; author: string; owner: string; repo: string; }> {
    log(`Fetching PR details for PR #${this.prNumber}...`);
    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
      });

      const labels = pr.labels.map(label => label.name);
      // Basic issue parsing from body, can be improved
      const relatedIssues = pr.body?.match(/#\d+/g) || [];

      return {
        title: pr.title,
        body: pr.body || '',
        baseBranch: pr.base.ref,
        sourceCommit: pr.head.sha, // Add the source commit SHA
        sourceBranch: pr.head.ref,
        labels,
        relatedIssues,
        author: pr.user.login,
        owner: this.owner,
        repo: this.repo,
      };
    } catch (error: any) {
      error('Failed to fetch PR details:', error);
      throw error;
    }
  }

  async getPullRequestDiff(): Promise<string> {
    log('Fetching PR diff...');
    const { data: diff } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
      mediaType: {
        format: 'diff',
      },
    });
    // The response is a string when using the 'diff' format
    return diff as unknown as string;
  }

  async getFileContent(filePath: string, ref: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: ref, // Branch, SHA, or tag
      });

      if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      throw new Error(`Could not retrieve content for ${filePath}. Response did not contain content.`);
    } catch (err: any) { // Explicitly type error as 'any' for broader catching
      error(`Failed to fetch content for ${filePath} at ref ${ref}:`, err);
      // Return empty string if file not found (e.g., deleted files in a PR)
      return '';
    }
  }

  async getMetadata(ref: string): Promise<LinterMetadata> {
    try {
      const content = await this.getFileContent('falcon-linter-metadata.json', ref);
      if (content) {
        return JSON.parse(content) as LinterMetadata;
      }
    } catch (error) {
      // Silently fail if metadata file is not found or invalid
      log('No valid falcon-linter-metadata.json found. Proceeding with default prompts.');
    }
    return {}; // Return empty object if no metadata is found
  }

  async updatePullRequestBody(newBody: string): Promise<void> {
    log('Updating PR body...');
    try {
      await this.octokit.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        body: newBody,
      });
      log('Successfully updated PR body.');
    } catch (error : any) {
      error('Failed to update PR body:', error);
      throw error;
    }
  }

  async postReview(comment: string): Promise<void> {
    log('Posting review comment...');
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.prNumber,
        body: comment,
      });
      log('Successfully posted review comment.');
    } catch (error : any) {
      error('Failed to post review comment:', error);
      throw error;
    }
  }

  // TODO: This is a simplified placeholder. A robust implementation would parse
  // file imports to build a dependency graph and find truly related files.
  async getRelatedFileContent(filePath: string): Promise<Map<string, string>> {
    log(`Fetching related files for ${filePath}... (placeholder logic)`);
    // Placeholder logic: for now, this method does not fetch related files.
    // A real implementation would use glob or an AST parser to find dependencies.
    return new Map<string, string>();
  }
}
