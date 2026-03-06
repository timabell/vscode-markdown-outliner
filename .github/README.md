# GitHub Actions CI/CD Setup

This directory contains the automated CI/CD pipeline for the VSCode Markdown Outliner extension.

## Overview

The workflow automatically:
- Builds and tests on every pull request
- Generates changelogs from semantic commits
- Calculates version bumps based on commit messages
- Packages the extension
- Publishes to GitHub Releases
- Publishes to VS Code Marketplace

## Files

### [cliff.toml](cliff.toml)
Configuration for [git-cliff](https://github.com/orhun/git-cliff) changelog generator. Defines which commit prefixes appear in release notes:
- `feat:` - Features
- `fix:` - Bug Fixes
- `perf:` - Performance improvements
- `doc:` - Documentation
- `style:` - Style changes

### [workflows/build-test.yml](workflows/build-test.yml)
Runs on pull requests and is called by the release workflow. Performs:
- Dependency installation
- Linting
- Compilation
- Testing
- Artifact upload

### [workflows/release.yml](workflows/release.yml)
Runs on pushes to main branch. Handles:
- Changelog generation
- Version calculation
- Extension packaging
- Git tagging
- GitHub Release creation
- VS Code Marketplace publishing

### [workflows/detect-bump.sh](workflows/detect-bump.sh)
Shell script that detects the type of semantic version bump (major/minor/patch) by examining commit footers.

## Commit Message Format

Use semantic commit prefixes for changes that should appear in the changelog:

```
feat: add support for nested lists
fix: resolve rendering issue with headings
perf: optimize toggle performance
doc: update installation instructions
style: improve toggle button appearance
```

For changes that shouldn't appear in release notes (like CI updates, chores), use other prefixes or no prefix.

## Version Bumps

By default, all releases are patch bumps. To trigger a different bump type, add a footer to your commit:

```
feat: add new collapse-all feature

bump: minor
```

Or for breaking changes:

```
feat: redesign configuration API

bump: major
```

## Required Secrets

For the workflow to publish to VS Code Marketplace, you need to set up:

1. **VSCE_PAT** - Personal Access Token for VS Code Marketplace
   - Create at: https://marketplace.visualstudio.com/manage/publishers/
   - Add to repository secrets: Settings → Secrets → Actions → New repository secret

## Local Testing

To preview release notes locally:

```bash
./release-notes.sh --preview  # Shows unreleased changes
./release-notes.sh            # Shows latest release
```

## Workflow Behavior

The release workflow only creates a new release if there are commits with semantic prefixes (`feat:`, `fix:`, etc.) since the last release. Other commits (like `chore:`, `ci:`) don't trigger releases but are still tracked in git history.
