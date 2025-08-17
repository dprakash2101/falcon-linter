export interface DetailedFileChange {
  filePath: string;
  fileDiff: string;
  status?: 'added' | 'modified' | 'deleted' | 'renamed';
}
