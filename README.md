# Falcon Linter

## About The Project

**Falcon Linter** is a command-line interface (CLI) tool that leverages the power of Google's Gemini AI to automatically review your pull requests. It acts as a "Senior Engineer" to help mentor your team by providing structured, line-by-line feedback in Markdown format, and posts it as a comment directly on your PR.

The goal is to provide helpful, educational, and constructive feedback to help junior engineers improve their code by providing clear, actionable suggestions.

## Key Features

-   **🤖 Falcon PR Reviewer Persona:** Get intelligent code reviews from an AI that acts like a senior engineer.
-   **📝 Actionable Feedback with Code Diff:** All review comments now include the `currentCode` and `suggestedCode` in a diff format, making feedback precise and easy to apply.
-   **🧠 Enhanced Contextual Understanding:** Provides Gemini with full file content (old and new) and detailed diffs for superior review quality and relevance.
-   **🎯 Granular Review Levels:** Choose between `line`-level (precise, diff-based) or `file`-level (high-level summary) reviews to suit your needs.
-   **💅 Rich Markdown Comments:** The review is formatted into a clean, readable Markdown comment with diff-style code blocks.
-   **🔄 Multi-Provider Support:** Works with both GitHub and Bitbucket.
-   **⚙️ Configurable:** Use custom prompts and style guides to tailor the review to your project's needs.
-   **🚀 CI/CD Friendly:** Designed to be easily integrated into your existing CI/CD pipelines.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following:

-   Node.js (v22 or later)
-   A GitHub or Bitbucket account.
-   A Google Gemini API Key.

### Getting Your Free Gemini API Key

You can get a free Gemini API key from Google AI Studio.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click on **"Get API key"** in the top left corner.
4.  Click **"Create API key"**.
5.  Copy your newly generated API key.

### Installation

You can install the tool globally from npm:

```bash
npm install -g falcon-linter
```

Alternatively, you can use it directly with `npx` in your CI/CD pipeline.

## 🚀 CI/CD Integration

The recommended way to use Falcon Linter is in a CI/CD environment.

### For GitHub (GitHub Actions)

1.  **Add Secrets to your Repository**:
    *   Go to your repository's **Settings** > **Secrets and variables** > **Actions**.
    *   Click **New repository secret** and add the following:
        *   `FALCON_LINTER_GITHUB_TOKEN`: A [GitHub Personal Access Token](https://github.com/settings/tokens) with the `repo` scope.
        *   `GEMINI_API_KEY`: Your Google Gemini API key (see instructions above).

2.  **Create a Workflow File**:
    *   Create a new file in your repository at `.github/workflows/falcon-linter.yml`:

    ```yaml
    name: Falcon Linter Review

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
              # Required to get the base branch for diffing
              fetch-depth: 0

          - name: Install Node.js
            uses: actions/setup-node@v4

          - name: Install Falcon Linter
            run: npm install -g falcon-linter

          - name: Run Falcon Linter
            env:
              GITHUB_TOKEN: ${{ secrets.FALCON_LINTER_GITHUB_TOKEN }}
              GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
            run: |
              falcon-linter \
                --provider github \
                --pr-id ${{ github.event.pull_request.number }} \
                --owner ${{ github.repository_owner }} \
                --repo ${{ github.event.repository.name }}
    ```

### For Bitbucket (Bitbucket Pipelines)

1.  **Add Repository Variables**:
    *   Go to your repository's **Repository settings** > **Pipelines** > **Repository variables**.
    *   Add the following variables, making sure to check the **Secured** box for each:
        *   `BITBUCKET_USERNAME`: Your Bitbucket username.
        *   `BITBUCKET_APP_PASSWORD`: A [Bitbucket App Password](https://support.atlassian.com/bitbucket-cloud/docs/create-and-use-app-passwords/) with `pullrequests:write` permissions.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.

2.  **Create a `bitbucket-pipelines.yml` File**:
    *   Create or update your `bitbucket-pipelines.yml` file in the root of your repository with the following content. This example is a minimal, copy-paste ready template.

    ```yaml
image: node:22

pipelines:
  pull-requests:
    '*':
      - step:
          name: Run Falcon Linter Review
          script:
            # Fetch the full git history to allow diffing against the target branch
            - git fetch --unshallow || git fetch --all
            # Run the linter using npx, which handles the package download and execution
            - npx falcon-linter \
                --provider bitbucket \
                --pr-id $BITBUCKET_PULL_REQUEST_ID \
                --workspace $BITBUCKET_WORKSPACE \
                --repo-slug $BITBUCKET_REPO_SLUG
```

---

## 🛠️ Advanced Configuration

You can customize the linter's behavior by adding the following options to the `falcon-linter` command in your CI/CD workflow file.

### `--model <model>`
Specifies the Gemini model to use for the review.
-   **Default**: `gemini-2.0-flash`
-   **Example**: `--model gemini-1.5-pro-latest`

### `--prompt <prompt>`
Provides a custom prompt to guide the AI's review process.
-   **Default**: "Review this PR for best practices."
-   **Example**: `--prompt "Focus on security vulnerabilities and performance issues."`

### `--style-guide <styleGuide>`
Specifies a style guide for the AI to follow.
-   **Default**: "Google TypeScript Style Guide"
-   **Example**: `--style-guide "Airbnb JavaScript Style Guide"`

### `--ignore-files <files>`
A comma-separated list of glob patterns to ignore files from the review.
-   **Example**: `--ignore-files "**/__tests__/**,**/*.spec.ts,**/docs/**"`

### `--review-level <level>`
The level of review to perform.
-   **Options**: `line` or `file`
-   **Default**: `file`
-   **`line`**: Comments will be attached to specific lines of code.
-   **`file`**: Comments will be made at the file level.
-   **Example**: `--review-level line`

### Example with Advanced Configuration (GitHub Actions)
```yaml
# ... (previous steps)
          - name: Run Falcon Linter with Advanced Config
            env:
              GITHUB_TOKEN: ${{ secrets.FALCON_LINTER_GITHUB_TOKEN }}
              GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
            run: |
              falcon-linter \
                --provider github \
                --pr-id ${{ github.event.pull_request.number }} \
                --owner ${{ github.repository_owner }} \
                --repo ${{ github.event.repository.name }} \
                --model gemini-1.5-pro-latest \
                --prompt "Please check for logical errors and suggest improvements." \
                --ignore-files "**/migrations/**,**/*.md" \
                --review-level line
```

---

## 💻 Local Testing

For debugging or testing purposes, you can run the linter locally.

1.  **Install**: `npm install -g falcon-linter`
2.  **Set Environment Variables**:
    -   For GitHub:
        ```bash
        export GITHUB_TOKEN="your-github-personal-access-token"
        export GEMINI_API_KEY="your-gemini-api-key"
        ```
    -   For Bitbucket:
        ```bash
        export BITBUCKET_USERNAME="your-bitbucket-username"
        export BITBUCKET_APP_PASSWORD="your-bitbucket-app-password"
        export GEMINI_API_KEY="your-gemini-api-key"
        ```
3.  **Run the Linter**:
    -   For GitHub:
        ```bash
        falcon-linter \
          --provider github \
          --pr-id <your-pr-id> \
          --owner <repository-owner> \
          --repo <repository-name>
        ```
    -   For Bitbucket:
        ```bash
        falcon-linter \
          --provider bitbucket \
          --pr-id <your-pr-id> \
          --workspace <your-workspace> \
          --repo-slug <your-repo-slug>
        ```

## 👨‍💻 Author

**Devi Prakash Kandikonda**

-   **GitHub**: [dprakash2101](https://github.com/dprakash2101)
-   **Email**: deviprakash9321@gmail.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.