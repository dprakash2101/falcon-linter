<h1 align="center">Falcon Linter</h1>

<p align="center">
  Your AI-powered "Senior Engineer" for automated pull request reviews.
  <br />
  <a href="https://github.com/dprakash2101/falcon-linter/issues/new?labels=bug">Report Bug</a>
  ·
  <a href="https://github.com/dprakash2101/falcon-linter/issues/new?labels=feature-request">Request Feature</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/falcon-linter"><img src="https://img.shields.io/npm/v/falcon-linter?style=for-the-badge" alt="NPM version"></a>
  <a href="https://www.npmjs.com/package/falcon-linter"><img src="https://img.shields.io/npm/dm/falcon-linter?style=for-the-badge" alt="NPM downloads"></a>
  <a href="https://github.com/dprakash2101/falcon-linter/blob/main/LICENSE"><img src="https://img.shields.io/github/license/dprakash2101/falcon-linter?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/dprakash2101/falcon-linter/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/dprakash2101/falcon-linter/ci.yml?branch=main&style=for-the-badge" alt="CI"></a>
</p>

---

## About The Project

**Falcon Linter** is a command-line interface (CLI) tool that leverages the power of Google's Gemini AI to automatically review your pull requests. It acts as a "Senior Engineer" to help mentor your team by providing structured, line-by-line feedback in Markdown format, and posts it as a comment directly on your PR.

The goal is to provide helpful, educational, and constructive feedback to help junior engineers improve their code by providing clear, actionable suggestions.

## Key Features

-   **🤖 Senior Engineer Persona:** Get intelligent code reviews from an AI that acts like a senior engineer.
-   **📝 Detailed, Actionable Feedback:** The review includes the current code, the suggested code, and a detailed reason for the change.
-   **🎯 Granular Review Levels:** Choose between `line`-level (precise, diff-based) or `file`-level (high-level summary) reviews to suit your needs.
-   **💅 Rich Markdown Comments:** The review is formatted into a clean, readable Markdown comment with diff-style code blocks.
-   **🔄 Multi-Provider Support:** Works with both GitHub and Bitbucket.
-   **⚙️ Configurable:** Use custom prompts and style guides to tailor the review to your project's needs.
-   **🚀 CI/CD Friendly:** Designed to be easily integrated into your existing CI/CD pipelines.

## Getting Started

### Prerequisites

-   Node.js (v22 or later)
-   An active Google AI Studio account with a Gemini API key.
-   A GitHub or Bitbucket account.

### Installation

You can install the tool globally from npm:

```bash
npm install -g falcon-linter
```

Alternatively, you can use it directly with `npx` in your CI/CD pipeline.

### Configuration

This tool requires API keys and tokens to be set as environment variables. You can set them directly in your CI/CD pipeline's secret management system.

-   `GEMINI_API_KEY`: Your API key for the Gemini API.
-   `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope.
-   `BITBUCKET_TOKEN`: A Bitbucket App Password with `pullrequests:write` scope.

## Usage

### General Options

-   `--provider <provider>`: (Required) The Git provider (`github` or `bitbucket`).
-   `--pr-id <prId>`: (Required) The ID of the pull request to review.
-   `--model <model>`: (Optional) The Gemini model to use. Defaults to `gemini-2.0-flash`.
-   `--prompt <prompt>`: (Optional) A custom prompt for the AI.
-   `--style-guide <styleGuide>`: (Optional) A custom style guide for the AI to follow.
-   `--base-branch <baseBranch>`: (Optional) The base branch to compare against. Defaults to `main`.
-   `--ignore-files <files>`: (Optional) A comma-separated list of glob patterns to ignore (e.g., `*.json,**/*.yml`).
-   `--review-level <level>`: (Optional) The level of review to perform (`line` or `file`). Defaults to `file`.

### Examples

#### GitHub

```bash
falcon-linter \
  --provider github \
  --pr-id 123 \
  --owner your-github-username \
  --repo your-repo-name
```

#### Bitbucket

```bash
falcon-linter \
  --provider bitbucket \
  --pr-id 456 \
  --workspace your-bitbucket-workspace \
  --repo-slug your-repo-slug
```

## Customizing the Review

You can customize the AI's review by providing a custom prompt and a style guide. This allows you to tailor the feedback to your project's specific needs and coding standards.

### Advanced Examples

#### Custom Prompt

You can provide a custom prompt to guide the AI's review. This is useful when you want to focus on specific aspects of the code.

```bash
falcon-linter \
  --provider github \
  --pr-id 123 \
  --owner your-github-username \
  --repo your-repo-name \
  --prompt "As a senior engineer, please review this PR for code style, performance, and security."
```

#### Multi-line Prompt from a File

For more complex prompts, you can pass in a multi-line prompt from a text file.

**`my-prompt.txt`:**

```
You are a senior engineer with a focus on clean code and best practices.
Please review the following pull request and provide feedback on:
- Code clarity and readability
- Adherence to the SOLID principles
- Potential performance bottlenecks
- Any security vulnerabilities
```

**Command:**

```bash
falcon-linter \
  --provider github \
  --pr-id 123 \
  --owner your-github-username \
  --repo your-repo-name \
  --prompt "$(cat my-prompt.txt)"
```

#### Using a Style Guide

You can also provide a style guide for the AI to follow. This ensures that the review is consistent with your project's coding standards.

```bash
falcon-linter \
  --provider github \
  --pr-id 123 \
  --owner your-github-username \
  --repo your-repo-name \
  --style-guide "Follow the Google TypeScript Style Guide. Pay close attention to naming conventions and type definitions."
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
          npx falcon-linter \
            --provider github \
            --pr-id ${{ github.event.pull_request.number }} \
            --owner ${{ github.repository_owner }} \
            --repo ${{ github.event.repository.name }} \
            --base-branch ${{ github.event.pull_request.base.ref }}
```

### Bitbucket Pipelines Example

Add the following to your `bitbucket-pipelines.yml` file. Make sure to configure `GEMINI_API_KEY` and `BITBUCKET_TOKEN` as repository variables in your Bitbucket settings.

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: AI Code Review
          image: node:22
          script:
            - npm i -g falcon-linter
            - >
              falcon-linter
              --provider bitbucket
              --pr-id $BITBUCKET_PULL_REQUEST_ID
              --workspace $BITBUCKET_WORKSPACE
              --repo-slug $BITBUCKET_REPO_SLUG
              --base-branch $BITBUCKET_PR_DESTINATION_BRANCH
```

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Author

**Devi Prakash Kandikonda**

-   GitHub: [@dprakash2101](https://github.com/dprakash2101)