# Falcon Linter

An AI-powered 'Senior Engineer' that reviews pull requests and provides mentorship in the comments.

Falcon Linter uses Google's Gemini AI to analyze your pull requests and provide feedback on best practices, potential bugs, and style violations. It is designed to be integrated directly into your CI/CD pipeline to automate code reviews securely.

## Features

-   **AI-Powered Reviews**: Get intelligent feedback on your code.
-   **GitHub & Bitbucket Integration**: Works with both major Git providers.
-   **Secure**: Designed to be used with CI/CD secrets.
-   **Automatic Branch Detection**: Automatically diffs the correct branches in a PR context.
-   **Customizable**: Configure the model, prompt, and style guide to fit your needs.

---

## Getting Started: CI/CD Integration

The recommended way to use Falcon Linter is in a CI/CD environment.

### For GitHub (GitHub Actions)

1.  **Add Secrets to your Repository**:
    *   Go to your repository's **Settings** > **Secrets and variables** > **Actions**, or click [here](https://github.com/dprakash2101/falcon-linter/settings/secrets/actions) to go directly to the secrets page for this repository (replace with your repository URL).
    *   Click **New repository secret** and add the following:
        *   `FALCON_LINTER_GITHUB_TOKEN`: A [GitHub Personal Access Token](https://github.com/settings/tokens) with the `repo` scope.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.

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
            with:
              node-version: '20'

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
    *   Go to your repository's **Repository settings** > **Pipelines** > **Repository variables**, or click [here](https://bitbucket.org/dprakash2101/falcon-linter/admin/pipelines/repository-variables) to go directly to the variables page for this repository (replace with your repository URL).
    *   Add the following variables, making sure to check the **Secured** box for each:
        *   `BITBUCKET_USERNAME`: Your Bitbucket username.
        *   `BITBUCKET_APP_PASSWORD`: A [Bitbucket App Password](https://support.atlassian.com/bitbucket-cloud/docs/create-and-use-app-passwords/) with `pullrequests:write` permissions.
        *   `GEMINI_API_KEY`: Your Google Gemini API key.

2.  **Create a `bitbucket-pipelines.yml` File**:
    *   Create or update your `bitbucket-pipelines.yml` file in the root of your repository:

    ```yaml
    image: node:20

pipelines:
  pull-requests:
    '*':
      - step:
          name: Run Falcon Linter
          script:
            # The fetch-depth is required to get the base branch for diffing
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

## Advanced Configuration

You can customize the linter's behavior by adding the following options to the `falcon-linter` command in your CI/CD workflow file.

### `--model <model>`
Specifies the Gemini model to use for the review.
-   **Default**: `gemini-1.5-flash`
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
                --prompt "Please check for logical errors and suggest improvements."
                --ignore-files "**/migrations/**,**/*.md"
                --review-level line
```

---

## Local Testing

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

## Author

**Devi Prakash Kandikonda**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.