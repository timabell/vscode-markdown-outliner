#!/usr/bin/env bash

# Detects what type of semver increment we need based on git commit footers since the last tag.
# We use footers because git-cliff's regex only matches against the conventional commit TYPE
# (the part before ':', '!', or '('), not the full commit message or body.

set -euo pipefail

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$LAST_TAG" ]; then
  COMMITS=$(git log "$LAST_TAG..HEAD" --pretty=format:"%B")
else
  COMMITS=$(git log --pretty=format:"%B")
fi

if echo "$COMMITS" | grep -qE '^bump: major$'; then
  echo "major"
elif echo "$COMMITS" | grep -qE '^bump: minor$'; then
  echo "minor"
else
  echo "patch"
fi
