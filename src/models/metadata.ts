export interface LinterMetadata {
  projectInfo?: {
    language?: string;
    projectType?: string;
    framework?: string;
  };
  customPrompts?: {
    review?: string;
    summary?: string;
  };
}
