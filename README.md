# Falcon Linter
<p align="center">
  <b>An intelligent CLI assistant that provides expert-level code reviews and semantic summaries for your pull requests.</b>
</p>

---

Falcon Linter brings the power of Google's Gemini AI directly into your development workflow. It acts as a tireless senior engineer, analyzing your code changes to provide insightful feedback, enforce best practices, and help your team build higher-quality software, faster.

## Key Features

-   **🤖 Expert-Level Code Reviews:** Get detailed feedback on architecture, security, performance, and best practices.
-   **✨ Semantic Summaries:** Automatically generate summaries that describe the *impact* and *intent* of changes, not just the files touched.
-   **⚙️ Highly Customizable:** Use a `falcon-linter-metadata.json` file to teach the AI about your project and provide custom review instructions.
-   **🔄 Multi-Platform Support:** Integrates seamlessly with both **GitHub** and **Bitbucket**.
-   **✍️ Update PR Descriptions:** Automatically populate your pull request descriptions with AI-generated summaries.
-   **CI/CD Native:** Designed to be a natural part of your automated workflows.

## Getting Started

Getting started with Falcon Linter is simple.

1.  **Configure your repository:** Add a workflow file and the necessary API key secrets to your repository.
2.  **(Optional) Add a metadata file:** Create a `falcon-linter-metadata.json` file in your repository's root to customize the AI's behavior.

For a complete walkthrough, please see the **[➡️ Getting Started Guide](./docs/getting-started.md)**.

## Usage

Once installed and configured in your repository, Falcon Linter runs automatically on pull requests. You can also trigger it manually with a simple PR comment:

-   **To request a review:**
    ```
    /falcon-linter --reviewChanges
    ```
-   **To request a summary:**
    ```
    /falcon-linter --generateSummary
    ```
-   **To request a summary and update the PR body:**
    ```
    /falcon-linter --generateSummary --update-body
    ```

## Full Documentation

For a deep dive into all features, commands, and configuration options, please explore our **[Full Documentation](./docs/index.md)**.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Author

**Devi Prakash Kandikonda**

- **GitHub**: [dprakash2101](https://github.com/dprakash2101)
