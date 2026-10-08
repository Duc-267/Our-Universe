#!/usr/bin/env sh
set -eu

echo "[docs/architecture-check] verifying architecture notes"

if [ ! -f "docs/architecture.md" ]; then
  echo "ERROR: docs/architecture.md is missing."
  exit 1
fi

if ! grep -q "^## Layers$" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md is missing '## Layers'."
  exit 1
fi

if ! grep -q "^## Core modules$" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md is missing '## Core modules'."
  exit 1
fi

if ! grep -q "^## Decision records$" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md is missing '## Decision records'."
  exit 1
fi

if grep -q "YYYY-MM-DD" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md still contains the decision date placeholder."
  exit 1
fi

if grep -q "Define dependency direction:" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md still contains layer placeholder text."
  exit 1
fi

if grep -q "Module A:" "docs/architecture.md" || grep -q "Module B:" "docs/architecture.md"; then
  echo "ERROR: docs/architecture.md still contains core module placeholders."
  exit 1
fi

echo "[docs/architecture-check] ok"
