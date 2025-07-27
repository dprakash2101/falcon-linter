# StarshipScribe: AI Senior Engineer PR Reviewer

This command-line interface (CLI) tool leverages the power of Google's Gemini AI to automatically review your pull requests, acting as a "Senior Engineer" to help mentor your team. It provides structured, line-by-line feedback in Markdown format and posts it as a comment directly on your PR.

The goal is to provide helpful, educational, and constructive feedback to help junior engineers improve their code by providing clear, actionable suggestions.

## Features

- **Senior Engineer Persona:** Get intelligent code reviews from an AI that acts like a senior engineer.
- **Detailed, Actionable Feedback:** The review includes the current code, the suggested code, and a detailed reason for the change.
- **Rich Markdown Comments:** The review is formatted into a clean, readable Markdown comment with diff-style code blocks.
- **Multi-Provider Support:** Works with both GitHub and Bitbucket.
- **Configurable:** Use custom prompts and style guides to tailor the review to your project's needs.
- **CI/CD Friendly:** Designed to be easily integrated into your existing CI/CD pipelines.

## Prerequisites

- Node.js (v22 or later)
- An active Google AI Studio account with a Gemini API key.
- A GitHub or Bitbucket account.

## Installation

You can install the tool globally from npm:

```bash
npm install -g starship-scribe
```

Alternatively, you can use it directly with `npx` in your CI/CD pipeline.

## Configuration

This tool requires API keys and tokens to be set as environment variables. You can set them directly in your CI/CD pipeline's secret management system.

- `GEMINI_API_KEY`: Your API key for the Gemini API.
- `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope.
- `BITBUCKET_TOKEN`: A Bitbucket App Password with `pullrequests:write` scope.

## Usage

### General Options

- `--provider <provider>`: (Required) The Git provider (`github` or `bitbucket`).
- `--pr-id <prId>`: (Required) The ID of the pull request to review.
- `--model <model>`: (Optional) The Gemini model to use. Defaults to `gemini-1.5-flash`.
- `--prompt <prompt>`: (Optional) A custom prompt for the AI.
- `--style-guide <styleGuide>`: (Optional) A custom style guide for the AI to follow.
- `--base-branch <baseBranch>`: (Optional) The base branch to compare against. Defaults to `main`.

### GitHub

```bash
starship-scribe \
  --provider github \
  --pr-id 123 \
  --owner your-github-username \
  --repo your-repo-name
```

### Bitbucket

```bash
starship-scribe \
  --provider bitbucket \
  --pr-id 456 \
  --workspace your-bitbucket-workspace \
  --repo-slug your-repo-slug
```

## CI/CD Pipeline Integration

### GitHub Actions Example

Create a file named `.github/workflows/ai-review.yml`:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Run AI Review
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx starship-scribe \
            --provider github \
            --pr-id ${{ github.event.pull_request.number }} \
            --owner ${{ github.repository_owner }} \
            --repo ${{ github.event.repository.name }} \
            --base-branch ${{ github.event.pull_request.base.ref }}
```

### Bitbucket Pipelines Example

Add the following to your `bitbucket-pipelines.yml` file:

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: AI Code Review
          image: node:22
          script:
            - npm i -g starship-scribe
            - >
              starship-scribe
              --provider bitbucket
              --pr-id $BITBUCKET_PULL_REQUEST_ID
              --workspace $BITBUCKET_WORKSPACE
              --repo-slug $BITBUCKDE_REPO_SLUG
              --base-branch $BITBUCKET_PR_DESTINATION_BRANCH
```

## License

This project is licensed under the MIT License.

Authored by Devi Prakash Kandikonda.