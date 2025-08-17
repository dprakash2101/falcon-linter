export interface GitProvider {
  postReview(comment: string): Promise<void>;
  getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string; labels: string[]; relatedIssues: string[]; author: string; owner: string; repo: string }>;
}

export interface ProviderOptions {
  owner?: string;
  repo?: string;
  workspace?: string;
  repoSlug?: string;
}
