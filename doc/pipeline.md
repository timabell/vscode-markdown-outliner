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

## Publishing Setup

Publishing to the VS Code Marketplace requires several setup steps across multiple platforms. This only needs to be done once (plus annual token renewal).

### Prerequisites

This is completely bananas. Recorded here because I didn't remember it last time and I won't remember it next time. Originally [figured this out for the vscode profile shuffler](https://github.com/timabell/vscode-profile-shuffler/blob/main/README.md#publishing-an-extension).

1. **Create a Publisher Account**
   - Go to https://marketplace.visualstudio.com/manage/publishers/
   - Create a new publisher account if you don't have one
   - Note your publisher name (used in package.json and CLI commands)

2. **Generate Personal Access Token (PAT)**
   - First, find your Azure DevOps organization name:
     - Go to https://app.vssps.visualstudio.com/go/profile?mkt=en-us (this redirects to your Azure DevOps profile) - Your org name will be visible **in the URL** after the redirect and sign in.
       - Reference: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/faq-configure-customize-organization?view=azure-devops
   - Go to: `https://[yourorg].visualstudio.com/_usersSettings/tokens`
     - Replace `[yourorg]` with your Azure DevOps organization name (e.g., mine is `timwise`, i.e. https://timwise.visualstudio.com/_usersSettings/tokens )
   - Create a new Personal Access Token
   - **Expiration**: Maximum 1 year (you'll need to renew annually)
   - **Scopes**: Select Marketplace → Manage
   - Save the token immediately - you won't be able to see it again

3. **Add Token to GitHub Secrets**
   - Go to your repository: Settings → Secrets and variables → Actions
   - Create a new repository secret:
     - Name: `VSCE_PAT`
     - Value: Your Personal Access Token from step 2

### Local CLI Setup (Optional)

For manual publishing or testing locally:

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Login with your publisher account
vsce login [publisher-name]
# You'll be prompted for your PAT

# Package and publish manually
vsce package
vsce publish
```

### Additional Resources

- [Official VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions)
- Note: The publishing workflow is notably complex, spanning multiple disconnected platforms (VS Code Marketplace, Azure DevOps, GitHub). Document your setup for future reference, especially for token renewal.

## Local Testing

To preview release notes locally:

```bash
./release-notes.sh --preview  # Shows unreleased changes
./release-notes.sh            # Shows latest release
```

## Workflow Behavior

The release workflow only creates a new release if there are commits with semantic prefixes (`feat:`, `fix:`, etc.) since the last release. Other commits (like `chore:`, `ci:`) don't trigger releases but are still tracked in git history.
