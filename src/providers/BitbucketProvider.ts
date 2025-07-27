
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
    console.log(`Posting review to Bitbucket PR #${this.prId}...`);
    console.log(`API URL: ${this.apiUrl}`);

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
      console.log(`Response status: ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`Error posting review to Bitbucket PR #${this.prId}:`);
        if (axiosError.response) {
          console.error(`Status: ${axiosError.response.status}`);
          console.error('Data:', axiosError.response.data);
        } else if (axiosError.request) {
          console.error('No response received from Bitbucket.');
        } else {
          console.error('Error setting up request:', axiosError.message);
        }
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }
  }
}
