#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ "${1:-}" = "--preview" ]; then
  BUMP_TYPE=$(.github/workflows/detect-bump.sh || echo "")
  BUMP_ARG=""
  if [ -n "$BUMP_TYPE" ]; then
    BUMP_ARG="--bump"
  fi
  git cliff --config .github/cliff.toml $BUMP_ARG --unreleased
elif [ "${1:-}" = "" ]; then
  git cliff --config .github/cliff.toml --latest
else
  echo "Usage: $0 [--preview]"
  exit 1
fi
