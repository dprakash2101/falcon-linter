
import { GitProvider } from './types';
import { Octokit } from '@octokit/rest';

export class GitHubProvider implements GitProvider {
  private octokit: Octokit;

  constructor(
    private prId: number,
    private owner: string,
    private repo: string,
    token: string
  ) {
    this.octokit = new Octokit({ auth: token });
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
    }
  }
}
