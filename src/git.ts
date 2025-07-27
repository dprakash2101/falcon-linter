import { execSync } from 'child_process';
import { glob } from 'glob';
import micromatch from 'micromatch';

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