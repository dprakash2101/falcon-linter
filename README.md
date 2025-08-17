# Falcon Linter

**Falcon Linter** is a powerful command-line interface (CLI) tool that harnesses Google's Gemini AI to provide automated, senior-engineer-level code reviews for your pull requests (PRs). It delivers structured, line-by-line feedback in Markdown format, posted directly as comments on your PRs, fostering a mentorship-like experience for your team.

The goal is to empower developers, especially junior engineers, with clear, actionable, and educational suggestions to elevate code quality.

---

## ✨ Key Features

- **🤖 Senior Engineer Persona**: Intelligent code reviews powered by Gemini AI, mimicking a senior engineer's perspective.
- **📝 Actionable Feedback with Diffs**: Comments include `currentCode` and `suggestedCode` in a diff format for precise, easy-to-apply suggestions.
- **🧠 Deep Contextual Analysis**: Provides Gemini with full file content (old and new) and detailed diffs for highly relevant reviews.
- **🎯 Flexible Review Levels**: Choose `line`-level (granular, diff-based) or `file`-level (high-level summary) reviews.
- **💅 Polished Markdown Output**: Feedback is formatted in clean, readable Markdown with diff-style code blocks.
- **🔄 Multi-Platform Support**: Compatible with GitHub and Bitbucket.
- **⚙️ Highly Configurable**: Customize reviews with tailored prompts and style guides.
- **🚀 CI/CD Integration**: Seamlessly integrates into your CI/CD pipelines for automated workflows.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following before starting:

- **Node.js**: Version 22 or later
- **GitHub or Bitbucket Account**: For PR integration
- **Google Gemini API Key**: Required for AI-powered reviews

### Obtaining a Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Navigate to **"Get API key"** in the top left corner.
4. Click **"Create API key"**.
5. Copy the generated API key for use.

### Installation

Install Falcon Linter globally via npm:

```bash
npm install -g falcon-linter
```

Alternatively, use `npx` for direct integration in CI/CD pipelines without global installation.

---

## 🔧 CI/CD Integration

Falcon Linter is designed for seamless integration into CI/CD workflows.

### GitHub (GitHub Actions)

1. **Add Repository Secrets**:
   - Go to **Settings** > **Secrets and variables** > **Actions** in your repository.
   - Add the following secrets:
     - `FALCON_LINTER_GITHUB_TOKEN`: A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.
     - `GEMINI_API_KEY`: Your Google Gemini API key.

2. **Create a Workflow File**:
   - Create a file at `.github/workflows/falcon-linter.yml`:

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
             fetch-depth: 0  # Required for base branch diffing

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

### Bitbucket (Bitbucket Pipelines)

1. **Add Repository Variables**:
   - Navigate to **Repository settings** > **Pipelines** > **Repository variables**.
   - Add the following secured variables:
     - `BITBUCKET_USERNAME`: Your Bitbucket username.
     - `BITBUCKET_APP_PASSWORD`: A [Bitbucket App Password](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/) with `pullrequests:write` permissions.
     - `GEMINI_API_KEY`: Your Google Gemini API key.

2. **Create a `bitbucket-pipelines.yml` File**:
   - Add or update `bitbucket-pipelines.yml` in your repository root:

   ```yaml
   image: node:22

   pipelines:
     pull-requests:
       '*':
         - step:
             name: Run Falcon Linter Review
             script:
               # Fetch full git history for diffing
               - git fetch --unshallow || git fetch --all
               # Run linter with npx
               - npx falcon-linter \
                   --provider bitbucket \
                   --pr-id $BITBUCKET_PULL_REQUEST_ID \
                   --workspace $BITBUCKET_WORKSPACE \
                   --repo-slug $BITBUCKET_REPO_SLUG
   ```

---

## 🛠️ Advanced Configuration

Customize Falcon Linter by adding options to the `falcon-linter` command in your CI/CD workflow.

### `--model <model>`
Specifies the Gemini model for reviews.
- **Default**: `gemini-2.0-flash`
- **Example**: `--model gemini-2.5-pro`

### `--prompt <prompt>`
Guides the AI's review focus with a custom prompt.
- **Default**: "Review this PR for best practices."
- **Example**: `--prompt "Focus on security vulnerabilities and performance optimizations."`

### `--style-guide <styleGuide>`
Sets a style guide for the AI to follow.
- **Default**: "Google TypeScript Style Guide"
- **Example**: `--style-guide "Airbnb JavaScript Style Guide"`

### `--ignore-files <files>`
Comma-separated glob patterns to exclude files from review.
- **Example**: `--ignore-files "**/__tests__/**,**/*.spec.ts,**/docs/**"`

### `--review-level <level>`
Chooses the review granularity.
- **Options**: `line` (specific line comments) or `file` (file-level summaries)
- **Default**: `file`
- **Example**: `--review-level line`

### Example: Advanced GitHub Actions Configuration
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
      --prompt "Check for logical errors and suggest improvements." \
      --ignore-files "**/migrations/**,**/*.md" \
      --review-level line
```

---

## 👨‍💻 Author

**Devi Prakash Kandikonda**

- **GitHub**: [dprakash2101](https://github.com/dprakash2101)
- **Email**: deviprakash9321@gmail.com

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
*Built with 💻 and ☕ by Devi Prakash Kandikonda*