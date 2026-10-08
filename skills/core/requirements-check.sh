#!/usr/bin/env sh
set -eu

echo "[core/requirements-check] verifying context files"

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md is missing."
  exit 1
fi

if [ ! -d "docs/requirements" ]; then
  echo "ERROR: docs/requirements directory is missing."
  exit 1
fi

count="$(find docs/requirements -type f -name '*.md' | wc -l | tr -d ' ')"
if [ "$count" -lt 1 ]; then
  echo "ERROR: add at least one requirement markdown file."
  exit 1
fi

for file in docs/requirements/*.md; do
  [ -f "$file" ] || continue
  if ! grep -q "^## Goal$" "$file"; then
    echo "ERROR: $file is missing '## Goal'."
    exit 1
  fi
  if ! grep -q "^## Definition of Done$" "$file"; then
    echo "ERROR: $file is missing '## Definition of Done'."
    exit 1
  fi
  if ! grep -q "^## Constraints$" "$file"; then
    echo "ERROR: $file is missing '## Constraints'."
    exit 1
  fi
  if ! grep -q "^## Out of scope$" "$file"; then
    echo "ERROR: $file is missing '## Out of scope'."
    exit 1
  fi
done

if [ "${STAGE:-manual}" = "pre-push" ] || [ "${STAGE:-manual}" = "pr-check" ]; then
  real_count="$(find docs/requirements -type f -name '*.md' ! -name 'feature-template.md' | wc -l | tr -d ' ')"
  if [ "$real_count" -lt 1 ]; then
    echo "ERROR: add at least one non-template requirement file before pre-push/pr-check."
    exit 1
  fi
fi

echo "[core/requirements-check] ok"
