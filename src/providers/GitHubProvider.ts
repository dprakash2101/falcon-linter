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

  async getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string }> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prId,
      });
      return { title: data.title, body: data.body || '', baseBranch: data.base.ref };
    } catch (error) {
      console.error(`Error fetching PR details for GitHub PR #${this.prId}:`, error);
      return { title: '', body: '', baseBranch: '' };
    }
  }
}