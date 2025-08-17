import * as fs from 'fs';

export interface CIContext {
  provider: string;
  owner?: string;
  repo?: string;
  prNumber?: number;
  command?: string;
}

/**
 * Detects the CI environment and extracts relevant context.
 * Currently supports GitHub Actions.
 * 
 * @returns {CIContext | null} The context from the CI environment, or null if not in a supported CI environment.
 */
export function getCIContext(): CIContext | null {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

      const prNumber = event.pull_request?.number || event.issue?.number;
      const repository = event.repository;

      if (!prNumber || !repository) {
        return null;
      }

      let command = '';
      if (event.comment) { // From an issue_comment trigger
        command = event.comment.body;
      } else { // From a pull_request trigger
        command = 'review'; // Default command for automatic PR reviews
      }

      return {
        provider: 'github',
        owner: repository.owner.login,
        repo: repository.name,
        prNumber: parseInt(prNumber, 10),
        command: command,
      };
    } catch (error) {
      console.error('Failed to parse GITHUB_EVENT_PATH JSON:', error);
      return null;
    }
  } else if (process.env.BITBUCKET_BUILD_NUMBER) { // Check for Bitbucket Pipelines environment
    try {
      const prNumber = process.env.BITBUCKET_PULL_REQUEST_ID;
      const owner = process.env.BITBUCKET_REPO_OWNER;
      const repo = process.env.BITBUCKET_REPO_SLUG;

      if (!prNumber || !owner || !repo) {
        return null;
      }

      return {
        provider: 'bitbucket',
        owner: owner,
        repo: repo,
        prNumber: parseInt(prNumber, 10),
        // In Bitbucket, the command is passed via a custom variable
        command: process.env.FALCON_COMMAND || 'review',
      };
    } catch (error) {
      console.error('Failed to parse Bitbucket environment variables:', error);
      return null;
    }
  }

  return null;
}
