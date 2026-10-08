#!/usr/bin/env sh
set -eu

echo "[quality/dod-check] verifying requirement checklists"

failed=0

for file in docs/requirements/*.md; do
  [ -f "$file" ] || continue
  if [ "$(basename "$file")" = "feature-template.md" ]; then
    continue
  fi
  if grep -q "## Definition of Done" "$file"; then
    if ! grep -Eq -- "- \[( |x|X)\]" "$file"; then
      echo "ERROR: $file has no DoD checklist item."
      failed=1
    fi
  else
    echo "ERROR: $file is missing '## Definition of Done'."
    failed=1
  fi

  if [ "${STAGE:-manual}" = "pre-push" ] || [ "${STAGE:-manual}" = "pr-check" ]; then
    if grep -q -- "- \[ \]" "$file"; then
      echo "ERROR: $file has unchecked DoD items for stage ${STAGE:-manual}."
      failed=1
    fi
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "[quality/dod-check] ok"
