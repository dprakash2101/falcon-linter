import { GitProvider } from './types';
import axios, { AxiosError } from 'axios';

export class BitbucketProvider implements GitProvider {
  private apiUrl: string;
  private appPassword: string;
  private username: string;

  constructor(
    private prId: number,
    private workspace: string,
    private repoSlug: string,
    username: string,
    appPassword: string
  ) {
    this.apiUrl = `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${this.prId}/comments`;
    this.username = username;
    this.appPassword = appPassword;
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
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.appPassword}`).toString('base64')}`,
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
      const authHeader = `Basic ${Buffer.from(`${this.username}:${this.appPassword}`).toString('base64')}`;
      console.log(`[DEBUG] Using Authorization header: ${authHeader.substring(0, 20)}... (redacted)`); // 🔐 Remove this after testing!
      const response = await axios.get(
        `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${this.prId}`,
        {
          headers: {
            Authorization: authHeader,
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