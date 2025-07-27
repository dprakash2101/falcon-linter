import { GitProvider } from './types';
import axios, { AxiosError } from 'axios';

export class BitbucketProvider implements GitProvider {
  private apiUrl: string;
  private token: string;

  constructor(
    private prId: number,
    private workspace: string,
    private repoSlug: string,
    token: string
  ) {
    this.apiUrl = `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${this.prId}/comments`;
    this.token = token;
  }

  async postReview(comment: string): Promise<void> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          content: {
            raw: comment,
            markup: 'MARKDOWN',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      console.log(`Successfully posted review to Bitbucket PR #${this.prId}.`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`Error posting review to Bitbucket PR #${this.prId}:`, axiosError.message);
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  }

  async getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string }> {
    try {
      const response = await axios.get(
        `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${this.prId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );
      return { title: response.data.title, body: response.data.description || '', baseBranch: response.data.destination.branch.name };
    } catch (error) {
      console.error(`Error fetching PR details for Bitbucket PR #${this.prId}:`, error);
      return { title: '', body: '', baseBranch: '' };
    }
  }
}