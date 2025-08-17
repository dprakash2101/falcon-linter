import { GitProvider } from '../models/provider';
import { Octokit } from '@octokit/rest';
import config from '../config';

export class GitHubProvider implements GitProvider {
  private octokit: Octokit;

  constructor(
    private prId: number,
    private owner: string,
    private repo: string
  ) {
    if (!config.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for GitHub provider');
    }
    this.octokit = new Octokit({ auth: config.GITHUB_TOKEN });
  }

  async postReview(comment: string): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.prId,
        body: comment,
      });
      console.log(`Successfully posted review to GitHub PR #${this.prId}`);
    } catch (error) {
      console.error(`Error posting review to GitHub PR #${this.prId}:`, error);
      throw error;
    }
  }

  private extractRelatedIssues(body: string): string[] {
    const keywords = ['closes', 'fixes', 'resolves'];
    const regex = new RegExp(`(?:${keywords.join('|')})\\s+#(\\d+)`, 'gi');
    const issues: string[] = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
      issues.push(`#${match[1]}`);
    }
    return issues;
  }

  async getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string; labels: string[]; relatedIssues: string[]; author: string; owner: string; repo: string; }> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prId,
      });
      const labels = data.labels.map(label => label.name);
      const relatedIssues = this.extractRelatedIssues(data.body || '');
      const author = data.user.login;
      return { title: data.title, body: data.body || '', baseBranch: data.base.ref, labels, relatedIssues, author, owner: this.owner, repo: this.repo };
    } catch (error) {
      console.error(`Error fetching PR details for GitHub PR #${this.prId}:`, error);
      return { title: '', body: '', baseBranch: '', labels: [], relatedIssues: [], author: '', owner: '', repo: '' };
    }
  }
}