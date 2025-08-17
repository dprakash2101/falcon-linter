---
layout: default
title: Providers
---
# Provider-Specific Information

Falcon Linter supports both GitHub and Bitbucket. This document provides the specific workflow and pipeline templates for each platform.

## GitHub

To use Falcon Linter with GitHub, create a file at `.github/workflows/falcon-linter.yml` in your repository and add the following content.

```yaml
name: Falcon Linter Review

on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    name: Falcon Linter
    runs-on: ubuntu-latest

    if: |
      github.event_name == 'pull_request' ||
      (github.event_name == 'issue_comment' && github.event.issue.pull_request && 
      (contains(github.event.comment.body, '/falcon-linter --reviewChanges') || contains(github.event.comment.body, '/falcon-linter --generateSummary')))

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Falcon Linter
        uses: saikrishna1108/falcon-linter@main # Or your specific fork/version
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Note:** The above example assumes a published GitHub Action. The current implementation checks out the code directly, but this template reflects the final intended usage.

## Bitbucket

To use Falcon Linter with Bitbucket, create a `bitbucket-pipelines.yml` file in the root of your repository.

```yaml
# This pipeline assumes you have set up repository variables for:
# - GEMINI_API_KEY (secured)
# - BITBUCKET_USERNAME
# - BITBUCKET_APP_PASSWORD (secured)

definitions:
  steps:
    - step: &run-falcon-linter
        name: Run Falcon Linter
        image: node:18
        script:
          - npm install -g saikrishna1108/falcon-linter # Or your specific fork/version
          - falcon-linter
        services:
          - docker

pipelines:
  pull-requests:
    '**':
      - step:
          <<: *run-falcon-linter
          name: Automatic PR Review
          script:
            - export FALCON_COMMAND='review'
            - *run-falcon-linter.script

  custom:
    manual-review:
      - variables:
          - name: PR_NUMBER
      - step:
          <<: *run-falcon-linter
          name: Manual PR Review
          script:
            - export FALCON_COMMAND='/falcon-linter --reviewChanges'
            - export BITBUCKET_PULL_REQUEST_ID=$PR_NUMBER
            - *run-falcon-linter.script

    manual-summary:
      - variables:
          - name: PR_NUMBER
          - name: USER_PROMPT
            default: ''
      - step:
          <<: *run-falcon-linter
          name: Manual PR Summary
          script:
            - export FALCON_COMMAND="/falcon-linter --generateSummary ${USER_PROMPT}"
            - export BITBUCKET_PULL_REQUEST_ID=$PR_NUMBER
            - *run-falcon-linter.script
```

### Manual Triggers in Bitbucket

Because Bitbucket Pipelines cannot be triggered by pull request comments, you must run the `manual-review` and `manual-summary` pipelines from the Bitbucket UI. You will be prompted to enter the Pull Request number when you run the pipeline.
