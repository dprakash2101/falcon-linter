# Falcon Linter

## About The Project

**Falcon Linter** is an enterprise-ready CLI tool that integrates with your CI/CD pipeline to provide automated, AI-driven pull request reviews. By leveraging Google's Gemini, it acts as a virtual "Senior Engineer," enforcing coding standards and mentoring developers directly within their workflow.

This tool is designed to enhance team productivity, standardize code quality, and accelerate the development lifecycle.

## Why Falcon Linter for Your Team?

-   **🚀 Accelerate Code Reviews:** Automate the initial, time-consuming pass of a code review. This frees up senior developers to focus on high-level architecture and complex logic, significantly reducing PR turnaround time.

-   **📈 Improve Code Quality & Consistency:** Enforce consistent coding standards and best practices across all projects and teams. Falcon Linter identifies potential bugs, style violations, and areas for improvement before they merge.

-   **👨‍🏫 Scale Developer Mentorship:** Provide immediate, high-quality, and constructive feedback to all developers. This serves as a powerful, scalable training tool to upskill junior and mid-level engineers, fostering a culture of continuous improvement.

-   **🔒 Enterprise-Grade Security:** Falcon Linter runs entirely within your own secure CI/CD environment. Your code is never sent to or stored on a third-party server, ensuring it remains confidential.

## Key Features

-   **🤖 Automated Code Quality Assurance:** Get intelligent code reviews from an AI that acts like a senior engineer.
-   **📝 Actionable Feedback with Code Diff:** Review comments include `currentCode` and `suggestedCode` in a diff format for precise, easy-to-apply feedback.
-   **🧠 Enhanced Contextual Understanding:** Provides the AI with full file content and detailed diffs for superior review quality.
-   **🎯 Granular Review Levels:** Choose between `line`-level (precise, diff-based) or `file`-level (high-level summary) reviews.
-   **🔄 Multi-Provider Support:** Seamlessly integrates with both GitHub and Bitbucket.
-   **⚙️ Fully Configurable:** Tailor the review process with custom prompts and style guides to match your team's standards.
-   **🚀 CI/CD Native:** Designed for easy integration into your existing CI/CD pipelines.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following:

-   Node.js (v22 or later)
-   A GitHub or Bitbucket account.
-   A Google Gemini API Key.

### Getting Your Gemini API Key

A Gemini API key is required. For enterprise use, it is recommended to manage API keys through a Google Cloud Platform (GCP) project for enhanced security and management. For individual developers or trial purposes, keys can be generated from Google AI Studio.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click on **"Get API key"** and then **"Create API key"**.
4.  Copy your newly generated API key.

### Installation

```bash
npm install -g falcon-linter
```

## 🚀 CI/CD Integration

Integrate Falcon Linter directly into your existing CI/CD workflows.

### For GitHub (GitHub Actions)

1.  **Add Secrets to your Repository**:
    *   In your repository, go to **Settings** > **Secrets and variables** > **Actions**.
    *   Add the following secrets:
        *   `FALCON_LINTER_GITHUB_TOKEN`: A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.

2.  **Create a Workflow File** (`.github/workflows/falcon-linter.yml`):

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
              fetch-depth: 0

          - name: Install Node.js
            uses: actions/setup-node@v4

          - name: Install and Run Falcon Linter
            run: npx falcon-linter \
              --provider github \
              --pr-id ${{ github.event.pull_request.number }} \
              --owner ${{ github.repository_owner }} \
              --repo ${{ github.event.repository.name }}
            env:
              GITHUB_TOKEN: ${{ secrets.FALCON_LINTER_GITHUB_TOKEN }}
              GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    ```

### For Bitbucket (Bitbucket Pipelines)

1.  **Add Repository Variables**:
    *   In your repository, go to **Repository settings** > **Pipelines** > **Repository variables**.
    *   Add the following secured variables:
        *   `BITBUCKET_USERNAME`: Your Bitbucket username.
        *   `BITBUCKET_APP_PASSWORD`: A [Bitbucket App Password](https://support.atlassian.com/bitbucket-cloud/docs/create-and-use-app-passwords/) with `pullrequests:write` permissions.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.

2.  **Create a `bitbucket-pipelines.yml` File**:

    ```yml
    image: node:22

pipelines:
  pull-requests:
    '*':
      - step:
          name: Run Falcon Linter
          script:
            - git config --global --add safe.directory $BITBUCKET_CLONE_DIR
            - git fetch --unshallow || git fetch --all
            - npm install -g falcon-linter
            - falcon-linter \
                --provider bitbucket \
                --pr-id $BITBUCKET_PULL_REQUEST_ID \
                --workspace $BITBUCKET_WORKSPACE \
                --repo-slug $BITBUCKET_REPO_SLUG
    ```

---

## 🛠️ Advanced Configuration

Customize the linter's behavior by adding the following options to the `falcon-linter` command.

| Option          | Description                                                 | Default                          |
| --------------- | ----------------------------------------------------------- | -------------------------------- |
| `--model`       | The Gemini model to use for the review.                     | `gemini-2.0-flash`               |
| `--prompt`      | A custom prompt to guide the AI's review process.           | "Review this PR for best practices." |
| `--style-guide` | A style guide for the AI to follow.                         | "Google TypeScript Style Guide"  |
| `--ignore-files`| Comma-separated list of glob patterns to ignore files.      |                                  |
| `--review-level`| The level of review: `line` or `file`.                      | `file`                           |

---

## 👨‍💻 Author

**Devi Prakash Kandikonda**

-   **GitHub**: [dprakash2101](https://github.com/dprakash2101)
-   **Email**: deviprakash9321@gmail.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.