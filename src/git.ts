import { execSync } from 'child_process';
import { glob } from 'glob';
import * as fs from 'fs';

export interface DetailedFileChange {
  filePath: string;
  oldContent: string;
  newContent: string;
  fileDiff: string;
  status: string;
  changedLines: number[];
}

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

export function getDetailedDiff(baseBranch: string): DetailedFileChange[] {
  try {
    execSync(`git fetch origin ${baseBranch}`);

    const changedFilesOutput = execSync(`git diff --name-status origin/${baseBranch}...HEAD`).toString().trim();
    const changedFiles: DetailedFileChange[] = [];

    if (!changedFilesOutput) {
      return [];
    }

    console.log('Changed files:', changedFilesOutput);

    const lines = changedFilesOutput.split('\n');

    for (const line of lines) {
      const [status, filePath] = line.split('\t');
      let oldContent = '';
      let newContent = '';
      let fileDiff = '';
      let changedLines: number[] = [];

      try {
        fileDiff = execSync(`git diff origin/${baseBranch}...HEAD -- "${filePath}"`).toString().trim();
        changedLines = extractChangedLines(fileDiff);
      } catch (diffError) {
        console.warn(`Could not get diff for ${filePath}: ${diffError}`);
      }

      if (status === 'A') {
        newContent = fs.readFileSync(filePath, 'utf-8');
      } else if (status === 'D') {
        oldContent = execSync(`git show origin/${baseBranch}:"${filePath}"`).toString('utf-8');
      } else if (status === 'M') {
        oldContent = execSync(`git show origin/${baseBranch}:"${filePath}"`).toString('utf-8');
        newContent = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.warn(`Unhandled file status: ${status} for ${filePath}`);
        continue;
      }

      changedFiles.push({ filePath, oldContent, newContent, fileDiff, status, changedLines });
    }

    return changedFiles;
  } catch (error) {
    console.error('Error getting detailed diff:', error);
    return [];
  }
}

function extractChangedLines(diff: string): number[] {
  const lines = diff.split('\n');
  const changedLines: number[] = [];
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match) {
        currentLine = parseInt(match[1], 10);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      changedLines.push(currentLine);
      currentLine++;
    } else if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  return changedLines;
}