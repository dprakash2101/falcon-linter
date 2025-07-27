export interface GitProvider {
  postReview(comment: string): Promise<void>;
  getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string }>;
}