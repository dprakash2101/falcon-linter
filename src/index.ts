#!/usr/bin/env node
import { Command } from 'commander';
import { review } from './reviewer';
import { createProvider } from './providers';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .version('1.0.0')
  .description('A CLI tool to review PRs using Gemini AI')
  .requiredOption('--provider <provider>', 'The Git provider (e.g., github, bitbucket)')
  .requiredOption('--pr-id <prId>', 'The pull request ID')
  // Model and review options
  .option('--model <model>', 'The Gemini model to use', 'gemini-2.0-flash')
  .option('-p, --prompt <prompt>', 'The prompt to use for the review', 'Review this PR for best practices.')
  .option('-s, --style-guide <styleGuide>', 'The style guide to use for the review', 'Google TypeScript Style Guide')
  .option('--base-branch <baseBranch>', 'The base branch to compare against', 'main')
  // GitHub specific options
  .option('--owner <owner>', 'The repository owner (for GitHub)')
  .option('--repo <repo>', 'The repository name (for GitHub)')
  // Bitbucket specific options
  .option('--workspace <workspace>', 'The workspace (for Bitbucket)')
  .option('--repo-slug <repoSlug>', 'The repository slug (for Bitbucket)')
  .action(async (options) => {
    console.log('Starting AI PR Review...');
    console.log('Options:', {
      provider: options.provider,
      prId: options.prId,
      model: options.model,
      baseBranch: options.baseBranch,
    });

    try {
      const prId = parseInt(options.prId, 10);
      
      let token: string | undefined;
      if (options.provider === 'github') {
        token = process.env.GITHUB_TOKEN;
        if (!token) throw new Error('GITHUB_TOKEN environment variable not set');
        console.log('Using GitHub provider.');
      } else if (options.provider === 'bitbucket') {
        token = process.env.BITBUCKET_TOKEN;
        if (!token) throw new Error('BITBUCKET_TOKEN environment variable not set');
        console.log('Using Bitbucket provider.');
      } else {
        throw new Error(`Unsupported provider: ${options.provider}`);
      }

      const provider = createProvider(options.provider, prId, {
        owner: options.owner,
        repo: options.repo,
        workspace: options.workspace,
        repoSlug: options.repoSlug,
        token: token,
      });

      console.log('Reviewing PR...');
      await review(provider, options.prompt, options.styleGuide, options.baseBranch, options.model);
      console.log('Review complete.');
    } catch (error) {
      console.error('Error during review:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
