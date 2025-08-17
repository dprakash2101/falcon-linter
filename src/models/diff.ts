export interface DetailedFileChange {
  filePath: string;
  previousFilePath?: string; // For renames
  fileDiff: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}
