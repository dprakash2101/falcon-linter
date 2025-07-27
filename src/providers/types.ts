
export interface GitProvider {
  postReview(comment: string): Promise<void>;
}
