import { GitHubProvider } from './GitHubProvider';
import { BitbucketProvider } from './BitbucketProvider';
import { GitProvider, ProviderOptions } from './types';

export function createProvider(provider: string, prId: number, options: ProviderOptions): GitProvider {
  console.log(`Creating provider for: ${provider}`);
  if (provider === 'github') {
    if (!options.owner || !options.repo) {
      throw new Error('owner and repo are required for GitHub provider');
    }
    if (!options.token) {
      throw new Error('token is required for GitHub provider');
    }
    return new GitHubProvider(prId, options.owner, options.repo, options.token);
  } else if (provider === 'bitbucket') {
    if (!options.workspace || !options.repoSlug) {
      throw new Error('workspace and repoSlug are required for Bitbucket provider');
    }
    if (!options.username || !options.appPassword) {
      throw new Error('username and appPassword are required for Bitbucket provider');
    }
    return new BitbucketProvider(prId, options.workspace, options.repoSlug, options.username, options.appPassword);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}