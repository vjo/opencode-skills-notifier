---
description: Create a new branch, commit changes, and submit a pull request with automatic commit splitting
---

# Create Pull Request

Create a new branch, commit changes, and submit a pull request.

## Behavior

- Creates a new branch based on current changes
- For frontend code, format modified files before committing.
- Analyzes changes and automatically splits into logical commits when appropriate
- Each commit focuses on a single logical change or feature
- Creates descriptive commit messages for each logical unit
- Pushes branch to remote
- **PR title format**: Use a short, descriptive title summarising the change
- Creates pull request in draft mode with `gh pr create --draft`

## Guidelines for Automatic Commit Splitting

- Split commits by feature, component, or concern
- Keep related file changes together in the same commit
- Separate refactoring from feature additions
- Ensure each commit can be understood independently
- Multiple unrelated changes should be split into separate commits

## E2E Test Verification

After creating the PR, identify and run related e2e tests:

1. **Modified e2e tests**: always run any e2e test files changed in this PR
2. **Impacted e2e tests**: analyze changed source files and identify which e2e tests cover those features; use judgment, cap at ~5 test files
