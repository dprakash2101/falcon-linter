import { GitProvider } from '../models/provider';
import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config';
import { LinterMetadata } from '../models/metadata';

export class BitbucketProvider implements GitProvider {
  private client: AxiosInstance;
  private prId: number;
  private workspace: string;
  private repoSlug: string;

  constructor(prId: number, workspace: string, repoSlug: string) {
    if (!config.BITBUCKET_USERNAME || !config.BITBUCKET_APP_PASSWORD) {
      throw new Error('BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD are required');
    }
    this.client = axios.create({
      auth: {
        username: config.BITBUCKET_USERNAME,
        password: config.BITBUCKET_APP_PASSWORD,
      },
    });
    this.prId = prId;
    this.workspace = workspace;
    this.repoSlug = repoSlug;
  }

  private getApiUrl(endpoint: string = '') {
    return `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests/${this.prId}${endpoint}`;
  }

  async getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string; sourceCommit: string; labels: string[]; relatedIssues: string[]; author: string; owner: string; repo: string; }> {
    try {
      const response = await this.client.get(this.getApiUrl());
      const prData = response.data;
      return {
        title: prData.title,
        body: prData.description || '',
        baseBranch: prData.destination.branch.name,
        sourceCommit: prData.source.commit.hash,
        author: prData.author.display_name,
        labels: [], // Bitbucket API v2 does not support labels on PRs in a standard way
        relatedIssues: [], // Placeholder, logic to parse from body could be added
        owner: this.workspace,
        repo: this.repoSlug,
      };
    } catch (error) {
      this.handleError(error, 'Error fetching PR details');
      throw error; // Re-throw after logging
    }
  }

  async getPullRequestDiff(): Promise<string> {
    try {
      const response = await this.client.get(this.getApiUrl('/diff'));
      return response.data;
    } catch (error) {
      this.handleError(error, 'Error fetching PR diff');
      throw error;
    }
  }

  async getFileContent(filePath: string, ref: string): Promise<string> {
    try {
      const response = await this.client.get(`https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/src/${ref}/${filePath}`);
      return response.data;
    } catch (error) {
      this.handleError(error, `Could not fetch content for ${filePath}`, false);
      return ''; // Return empty string if content is not available
    }
  }

  async getMetadata(): Promise<LinterMetadata> {
    try {
      const content = await this.getFileContent('falcon-linter-metadata.json', 'HEAD');
      if (content) {
        return JSON.parse(content) as LinterMetadata;
      }
    } catch (error) {
      console.log('No valid falcon-linter-metadata.json found.');
    }
    return {};
  }

  async updatePullRequestBody(newBody: string): Promise<void> {
    try {
      await this.client.put(this.getApiUrl(), { description: newBody });
      console.log('Successfully updated PR body.');
    } catch (error) {
      this.handleError(error, 'Error updating PR body');
      throw error;
    }
  }

  async postReview(comment: string): Promise<void> {
    try {
      await this.client.post(this.getApiUrl('/comments'), {
        content: { raw: comment },
      });
      console.log(`Successfully posted review to Bitbucket PR #${this.prId}.`);
    } catch (error) {
      this.handleError(error, 'Error posting review comment');
      throw error;
    }
  }

  private handleError(error: any, message: string, doThrow: boolean = true) {
    if (axios.isAxiosError(error)) {
      console.error(`${message}: ${error.message}`);
      if (error.response) {
        console.error('API Error Response:', error.response.data);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    if (doThrow) {
      throw new Error(message);
    }
  }
}
