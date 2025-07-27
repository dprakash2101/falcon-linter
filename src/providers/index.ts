import { GitProvider } from './types';
import { GitHubProvider } from './GitHubProvider';
import { BitbucketProvider } from './BitbucketProvider';

export function createProvider(
  providerName: string,
  prId: number,
  options: {
    owner?: string;
    repo?: string;
    workspace?: string;
    repoSlug?: string;
    token: string;
  }
): GitProvider {
  switch (providerName.toLowerCase()) {
    case 'github':
      if (!options.owner || !options.repo) {
        throw new Error('Missing owner or repo for GitHub provider');
      }
      return new GitHubProvider(prId, options.owner, options.repo, options.token);
    case 'bitbucket':
      if (!options.workspace || !options.repoSlug) {
        throw new Error('Missing workspace or repoSlug for Bitbucket provider');
      }
      return new BitbucketProvider(prId, options.workspace, options.repoSlug, options.token);
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}