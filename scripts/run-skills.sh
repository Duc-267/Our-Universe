#!/usr/bin/env sh
set -eu

MODE="local"
STAGE="manual"
ENABLED_FILE="skills/enabled.txt"
LOG_DIR=".harness/logs"
LOG_FILE="$LOG_DIR/last-run.log"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --stage)
      STAGE="${2:-}"
      shift 2
      ;;
    --enabled-file)
      ENABLED_FILE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 2
      ;;
  esac
done

mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

echo "run-skills mode=$MODE stage=$STAGE" | tee -a "$LOG_FILE"

failed=0
ran=0

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ""|\#*)
      continue
      ;;
  esac

  skill_script="skills/${line}.sh"
  if [ ! -x "$skill_script" ]; then
    echo "ERROR: skill script not executable or missing: $skill_script" | tee -a "$LOG_FILE"
    failed=$((failed + 1))
    continue
  fi

  echo "--- running $line ---" | tee -a "$LOG_FILE"
  if MODE="$MODE" STAGE="$STAGE" "$skill_script" 2>&1 | tee -a "$LOG_FILE"; then
    echo "--- passed $line ---" | tee -a "$LOG_FILE"
  else
    echo "--- failed $line ---" | tee -a "$LOG_FILE"
    failed=$((failed + 1))
  fi
  ran=$((ran + 1))
done < "$ENABLED_FILE"

echo "summary: ran=$ran failed=$failed log=$LOG_FILE" | tee -a "$LOG_FILE"

if [ "$failed" -ne 0 ]; then
  exit 1
fi
