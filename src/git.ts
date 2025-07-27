import { execSync } from 'child_process';

export function getDiff(baseBranch: string): string | null {
  try {
    const command = `git diff ${baseBranch}...HEAD`;
    console.log(`Running command: ${command}`);
    const diff = execSync(command).toString().trim();
    return diff.length > 0 ? diff : null;
  } catch (error) {
    console.error('Error getting diff:', error);
    return null;
  }
}
