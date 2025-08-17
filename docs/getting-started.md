---
layout: default
title: Getting Started
---
# Getting Started with Falcon Linter

This guide provides a step-by-step walkthrough for setting up Falcon Linter in your repository.

## Step 1: Create the Workflow File

Falcon Linter is triggered by a CI/CD workflow file. You need to add the appropriate file to your repository's workflow directory.

*   **For GitHub:** Create a file named `.github/workflows/falcon-linter.yml`.
*   **For Bitbucket:** Create a file named `bitbucket-pipelines.yml` at the root of your repository.

You can find templates for these files in the **[Providers](./providers.md)** documentation.

## Step 2: Configure Secrets

The linter requires API keys to communicate with the Gemini API and your Git provider.

1.  **`GEMINI_API_KEY`**: You need to generate an API key from Google AI Studio.
2.  **Provider Secrets**:
    *   **For GitHub:** The workflow uses the built-in `secrets.GITHUB_TOKEN`, so no extra secret is usually needed for public repos. For private repos, you might need a fine-grained Personal Access Token.
    *   **For Bitbucket:** You need to create a **BITBUCKET_APP_PASSWORD** with `pullrequest:write` permissions.

Add these as repository secrets in your GitHub or Bitbucket project settings.

## Step 3: (Optional) Create the Metadata File

To unlock the full power of Falcon Linter, you can create a `falcon-linter-metadata.json` file in the root of your repository.

This file allows you to:
*   Tell the AI about your project's language, type, and framework.
*   Provide custom instructions for reviews and summaries.

Here is a basic template:

```json
{
  "$schema": "https://raw.githubusercontent.com/saikrishna1108/falcon-linter/main/falcon-linter-metadata.schema.json",
  "projectInfo": {
    "language": "JavaScript",
    "projectType": "web-app",
    "framework": "React"
  },
  "customPrompts": {
    "review": "Please ensure all React components follow the new hooks-based pattern and that state management is handled via our Redux store.",
    "summary": "Summarize the user-facing changes for the release notes."
  }
}
```

## Step 4: Trigger the Linter

Once configured, Falcon Linter will run automatically on new pull requests. You can also trigger it manually by adding a comment to a PR:

*   To trigger a review: `/falcon-linter --reviewChanges`
*   To generate a summary: `/falcon-linter --generateSummary`
*   To generate a summary and update the PR body: `/falcon-linter --generateSummary --update-body`

That's it! You are now ready to use Falcon Linter.
