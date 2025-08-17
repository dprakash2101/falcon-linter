#!/usr/bin/env node
import { Command } from 'commander';
import { runReview, runSummary } from './reviewer';
import { createProvider } from './providers';
import { getCIContext } from './ci-env';

const program = new Command();

// Attempt to get context from CI environment
const ciContext = getCIContext();

program
  .version('0.5.0')
  .description('An intelligent AI assistant to review and summarize your pull requests.')
  .option('--provider <provider>', 'The Git provider to use (github or bitbucket)', ciContext?.provider)
  .option('--pr-number <prNumber>', 'The pull request number', ciContext?.prNumber?.toString())
  .option('--owner <owner>', 'The repository owner', ciContext?.owner)
  .option('--repo <repo>', 'The repository name', ciContext?.repo)
  .option('--command <command>', 'The command or comment that triggered the action', ciContext?.command)
  .option('--model-name <modelName>', 'The Gemini model to use', 'gemini-1.5-flash')
  .option('--update-body', 'Update the pull request body with the summary instead of posting a comment.', false)
  .action(async (options) => {
    // Validate required options are present from either CI or CLI
    if (!options.provider || !options.prNumber || !options.owner || !options.repo || !options.command) {
      console.error('Error: Missing required options. When running outside of a supported CI environment (like GitHub Actions), you must provide --provider, --pr-number, --owner, and --repo.');
      program.help();
      process.exit(1);
    }

    const prNumber = parseInt(options.prNumber, 10);
    const command = options.command.trim();

    const provider = createProvider(options.provider, prNumber, {
      owner: options.owner,
      repo: options.repo,
    });

    const ignoreFiles: string[] = []; // This can be populated from a config file in the future

    try {
      if (command.includes('--generateSummary')) {
        console.log('Starting AI PR Summary...');
        const userPrompt = command.replace('/falcon-linter --generateSummary', '').replace('--update-body', '').trim();
        await runSummary(provider, userPrompt, options.modelName, options.updateBody);
        console.log('✅ Summary complete.');
      } else if (command === 'review' || command.includes('--reviewChanges')) {
        console.log('Starting AI PR Review...');
        const userPrompt = command.replace('/falcon-linter --reviewChanges', '').trim();
        await runReview(
          provider,
          userPrompt,
          options.modelName,
          ignoreFiles
        );
        console.log('✅ Review complete.');
      } else {
        console.log(`Command \"${command}\" not recognized. Skipping.`);
      }
    } catch (error) {
      console.error('❌ Error during execution:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
