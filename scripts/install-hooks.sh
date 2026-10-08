#!/usr/bin/env sh
set -eu

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required."
  exit 1
fi

git config core.hooksPath .githooks
echo "Installed git hooks path: .githooks"
