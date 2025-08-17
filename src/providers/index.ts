import { GitHubProvider } from './GitHubProvider';
import { BitbucketProvider } from './BitbucketProvider';
import { GitProvider, ProviderOptions } from '../models/provider';

export function createProvider(provider: string, prId: number, options: ProviderOptions): GitProvider {
  console.log(`Creating provider for: ${provider}`);
  if (provider === 'github') {
    if (!options.owner || !options.repo) {
      throw new Error('owner and repo are required for GitHub provider');
    }
    return new GitHubProvider(prId, options.owner, options.repo);
  } else if (provider === 'bitbucket') {
    if (!options.workspace || !options.repoSlug) {
      throw new Error('workspace and repoSlug are required for Bitbucket provider');
    }
    return new BitbucketProvider(prId, options.workspace, options.repoSlug);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}