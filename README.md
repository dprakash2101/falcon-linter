# 🚀 Falcon Linter: Your AI-Powered Senior Engineer for Code Reviews

[![npm version](https://badge.fury.io/js/falcon-linter.svg)](https://www.npmjs.com/package/falcon-linter)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/dprakash2101/falcon-linter/ci.yml?branch=main)](https://github.com/dprakash2101/falcon-linter/actions/workflows/ci.yml)

Falcon Linter is a powerful command-line interface (CLI) tool that leverages Google's Gemini AI to provide **automated, senior-engineer-level code reviews** for your Pull Requests (PRs). It delivers structured, line-by-line feedback directly as comments on your PRs, fostering a mentorship-like experience for your team.

Our goal is to empower developers, especially junior engineers, with clear, actionable, and educational suggestions to elevate code quality.

---

## ✨ Key Features

*   **🤖 Senior Engineer Persona:** Intelligent code reviews powered by Gemini AI, mimicking a senior engineer’s perspective.
*   **📝 Actionable Feedback with Diffs:** Comments include `currentCode` and `suggestedCode` in a diff format for precise, easy-to-apply suggestions.
*   **🧠 Deep Contextual Analysis:** Provides Gemini with full file content (old and new) and detailed diffs for highly relevant reviews.
*   **🎯 Flexible Review Levels:** Choose line-level (granular, diff-based) or file-level (high-level summary) reviews.
*   **💅 Polished Markdown Output:** Feedback is formatted in clean, readable Markdown with diff-style code blocks.
*   **🔄 Multi-Platform Support:** Compatible with GitHub and Bitbucket.
*   **⚙️ Highly Configurable:** Customize reviews with tailored prompts and style guides.
*   **🚀 CI/CD Integration:** Seamlessly integrates into your CI/CD pipelines for automated workflows.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following before starting:

*   **Node.js:** Version 22 or later
*   **GitHub or Bitbucket Account:** For PR integration
*   **Google Gemini API Key:** Required for AI-powered reviews

### Obtaining a Free Gemini API Key

1.  Visit [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Navigate to “Get API key” in the top left corner.
4.  Click “Create API key”.
5.  Copy the generated API key for use.

### Installation

Install Falcon Linter globally via npm:

```bash
npm install -g falcon-linter
```

Alternatively, use `npx` for direct integration in CI/CD pipelines without global installation:

```bash
npx falcon-linter
```

---

## 🔧 CI/CD Integration

Falcon Linter is designed for seamless integration into your CI/CD workflows.

### GitHub (GitHub Actions)

1.  **Add Repository Secrets:**
    Go to `Settings > Secrets and variables > Actions` in your repository. Add the following secrets:
    *   `FALCON_LINTER_GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope.
    *   `GEMINI_API_KEY`: Your Google Gemini API key.

2.  **Create a Workflow File:**
    Create a file at `.github/workflows/falcon-linter.yml` with the following content:

    ```yaml
    name: Falcon Linter PR Review

    on:
      pull_request:
        types: [opened, reopened, synchronize]

    jobs:
      review:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout code
            uses: actions/checkout@v4
            with:
              fetch-depth: 0 # Required to get full diff history

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '22'

          - name: Install Falcon Linter
            run: npm install -g falcon-linter # Or use npx directly in the next step

          - name: Run Falcon Linter
            env:
              GITHUB_TOKEN: ${{ secrets.FALCON_LINTER_GITHUB_TOKEN }}
              GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
            run: |
              falcon-linter review --pr-url ${{ github.event.pull_request.html_url }}
    ```

### Bitbucket (Bitbucket Pipelines)

*(Example coming soon!)*

---

## 📚 Documentation

For more detailed information, guides, and advanced configurations, please visit our [official documentation site](https://dprakash2101.github.io/falcon-linter/).

---

## 🤝 Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` for details.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
