#!/usr/bin/env node
import { Command } from 'commander';
import { review } from './reviewer';
import { createProvider } from './providers';
import config from './config';

const program = new Command();

program
  .version('1.0.0')
  .description('A CLI tool to review PRs using Gemini AI')
  .requiredOption('--provider <provider>', 'The Git provider to use (github or bitbucket)')
  .requiredOption('--pr-id <prId>', 'The pull request ID')
  .option('--model <model>', 'The Gemini model to use', 'gemini-2.0-flash')
  .option('-p, --prompt <prompt>', 'The prompt to use for the review', 'Review this PR for best practices.')
  .option('-s, --style-guide <styleGuide>', 'The style guide to use for the review', 'Google TypeScript Style Guide')
  .option('--ignore-files <files>', 'A comma-separated list of glob patterns to ignore', '')
  .option('--review-level <level>', 'The level of review to perform (line or file)', 'file')
  .option('--output-blocks <blocks>', 'A comma-separated list of output blocks to include', 'actionableItems,overallSummary,positiveFeedback,suggestionSummary,fileDetails')

  // GitHub-specific options
  .option('--owner <owner>', 'The repository owner (for GitHub)')
  .option('--repo <repo>', 'The repository name (for GitHub)')

  // Bitbucket-specific options
  .option('--workspace <workspace>', 'The workspace (for Bitbucket)')
  .option('--repo-slug <repoSlug>', 'The repository slug (for Bitbucket)')

  .action(async (options) => {
    console.log('Starting AI PR Review...', {
      provider: options.provider,
      prId: options.prId,
      model: options.model,
    });

    try {
      const prId = parseInt(options.prId, 10);

      const provider = createProvider(options.provider, prId, {
        owner: options.owner,
        repo: options.repo,
        workspace: options.workspace,
        repoSlug: options.repoSlug,
      });

      const ignoreFiles = options.ignoreFiles
        ? options.ignoreFiles.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      const outputBlocks = options.outputBlocks
        ? options.outputBlocks.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      await review(
        provider,
        options.prompt,
        options.styleGuide,
        options.model,
        ignoreFiles,
        options.reviewLevel,
        outputBlocks
      );

      console.log('✅ Review complete.');
    } catch (error) {
      console.error('❌ Error during review:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
