export interface DiffFile {
  filePath: string;
  previousFilePath?: string;
  fileContent?: string;
  isNewFile?: boolean;
  isDeletedFile?: boolean;
  diff?: string;
}
