import { LinterMetadata } from "./metadata";
import { DetailedFileChange } from "./diff";

export interface GitProvider {
  postReview(comment: string): Promise<void>;
  getPullRequestDetails(): Promise<{ title: string; body: string; baseBranch: string; sourceCommit: string; sourceBranch: string; labels: string[]; relatedIssues: string[]; author: string; owner: string; repo: string; }>;
  getMetadata(ref: string): Promise<LinterMetadata>;
  updatePullRequestBody(newBody: string): Promise<void>;
  getPullRequestDiff(): Promise<string>;
  getFileContent(filePath: string, ref: string): Promise<string>;
}

export interface ProviderOptions {
  owner?: string;
  repo?: string;
  workspace?: string;
  repoSlug?: string;
}
