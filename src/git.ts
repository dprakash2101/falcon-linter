import { execSync } from 'child_process';
import { glob } from 'glob';
import * as fs from 'fs';

export function getDiff(baseBranch: string): string | null {
  try {
    const fetchCommand = `git fetch origin ${baseBranch}`;
    console.log(`Running command: ${fetchCommand}`);
    execSync(fetchCommand);

    const diffCommand = `git diff origin/${baseBranch}...HEAD`;
    console.log(`Running command: ${diffCommand}`);
    const diff = execSync(diffCommand).toString().trim();
    
    return diff.length > 0 ? diff : null;
  } catch (error) {
    console.error('Error getting diff:', error);
    return null;
  }
}

export function globFiles(ignorePatterns: string[]): string[] {
  try {
    const files = glob.sync('**/*', { ignore: ['node_modules/**', '.git/**', ...ignorePatterns] });
    return files;
  } catch (error) {
    console.error('Error globbing files:', error);
    return [];
  }
}

export interface DetailedFileChange {
  filePath: string;
  oldContent: string;
  newContent: string;
  fileDiff: string;
}

export function getDetailedDiff(baseBranch: string): DetailedFileChange[] {
  try {
    execSync(`git fetch origin ${baseBranch}`);

    const changedFilesOutput = execSync(`git diff --name-status origin/${baseBranch}...HEAD`).toString().trim();
    const changedFiles: DetailedFileChange[] = [];

    if (!changedFilesOutput) {
      return [];
    }

    const lines = changedFilesOutput.split('\n');

    for (const line of lines) {
      const [status, filePath] = line.split('\t');
      let oldContent = '';
      let newContent = '';
      let fileDiff = '';

      try {
        fileDiff = execSync(`git diff origin/${baseBranch}...HEAD -- "${filePath}"`).toString().trim();
      } catch (diffError) {
        console.warn(`Could not get diff for ${filePath}: ${diffError}`);
        // Continue even if diff fails for a specific file
      }

      if (status === 'A') { // Added
        newContent = fs.readFileSync(filePath, 'utf-8');
      } else if (status === 'D') { // Deleted
        oldContent = execSync(`git show origin/${baseBranch}:"${filePath}"`).toString('utf-8');
      } else if (status === 'M') { // Modified
        oldContent = execSync(`git show origin/${baseBranch}:"${filePath}"`).toString('utf-8');
        newContent = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.warn(`Unhandled file status: ${status} for ${filePath}`);
        continue;
      }

      changedFiles.push({ filePath, oldContent, newContent, fileDiff });
    }

    return changedFiles;
  } catch (error) {
    console.error('Error getting detailed diff:', error);
    return [];
  }
}