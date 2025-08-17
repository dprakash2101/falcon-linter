---
layout: default
title: Features
---
# Falcon Linter Features

This document provides a detailed look at the core features of Falcon Linter.

## AI-Powered Code Review

**Command:** `/falcon-linter --reviewChanges`

This is the core feature of the linter. When triggered, the AI performs a deep analysis of the code changes in a pull request. It does not just check for syntax; it acts as a senior engineer, providing feedback on a wide range of topics.

### The Review Checklist

The AI reviewer uses a built-in checklist to ensure a comprehensive analysis:

-   **Architecture & Design:** Checks for adherence to design patterns, SOLID principles, and scalability.
-   **Security:** Scans for common vulnerabilities like injection flaws, XSS, and insecure credential handling.
-   **Performance:** Looks for potential bottlenecks, inefficient algorithms, and memory leaks.
-   **Error Handling:** Ensures that error handling is robust and covers edge cases.
-   **Clarity & Maintainability:** Assesses code readability, naming conventions, and complexity.
-   **Best Practices:** Checks for adherence to language-specific and framework-specific best practices.
-   **Breaking Changes:** Uses the context of related files to identify changes that might break other parts of the application.

## Semantic Summaries

**Command:** `/falcon-linter --generateSummary`

Instead of just listing the files that changed, Falcon Linter provides a "semantic summary." It reads the PR title, description, and code diffs to understand the *intent* behind the changes.

The summary describes:
-   What user-facing features were added or changed.
-   What technical debt was addressed.
-   What core behavior was modified.

This is useful for writing release notes or quickly understanding the impact of a pull request.

## Update PR Body

**Command Flag:** `--update-body`

When added to the summary command (`/falcon-linter --generateSummary --update-body`), the generated summary will be used to update the main description of the pull request instead of being posted as a separate comment. This is useful for automatically populating the PR body if it is empty.

## Customization via Metadata

**File:** `falcon-linter-metadata.json`

This file, placed in the root of your repository, allows you to deeply customize the linter's behavior.

-   **`projectInfo`**: Tell the AI about your project's `language`, `projectType`, and `framework`. This helps it provide more contextually relevant feedback.
-   **`customPrompts`**: Add your own instructions for both `review` and `summary` tasks. This allows you to enforce team-specific standards, check for project-specific issues, or tailor the output format.
