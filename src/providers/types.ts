export interface GitProvider {
  postReview(comment: string): Promise<void>;
  getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string }>;
}

export interface ProviderOptions {
  owner?: string;
  repo?: string;
  workspace?: string;
  repoSlug?: string;
  token?: string;
  username?: string;
  appPassword?: string;
}