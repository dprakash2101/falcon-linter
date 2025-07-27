
import { GitProvider } from './types';
import Bitbucket from 'bitbucket';

export class BitbucketProvider implements GitProvider {
  private bitbucket: Bitbucket;

  constructor(
    private prId: number,
    private workspace: string,
    private repoSlug: string,
    token: string
  ) {
    this.bitbucket = new Bitbucket({
      auth: {
        token: token,
      },
    });
  }

  async postReview(comment: string): Promise<void> {
    try {
      await this.bitbucket.pullrequests.createComment({
        _body: {
          content: {
            raw: comment,
            markup: 'MARKDOWN',
          },
        },
        pull_request_id: this.prId,
        repo_slug: this.repoSlug,
        workspace: this.workspace,
      });
      console.log(`Successfully posted review to Bitbucket PR #${this.prId}`);
    } catch (error) {
      console.error(`Error posting review to Bitbucket PR #${this.prId}:`, error);
    }
  }
}
