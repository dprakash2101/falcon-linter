export interface ReviewComment {
  line?: number;
  currentCode: string;
  suggestedCode: string;
  reason: string;
  category: 'SECURITY' | 'PERFORMANCE' | 'READABILITY' | 'BUG' | 'DESIGN' | 'REFACTOR' | 'STYLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

export interface ReviewFile {
  filePath: string;
  comments: ReviewComment[];
}

export interface StructuredReview {
  overallSummary: string;
  positiveFeedback: string[];
  files: ReviewFile[];
}
