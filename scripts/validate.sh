#!/usr/bin/env bash
# Single entry point for local + CI validation (`npm run validate`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CURRENT_STEP="validate"

on_err() {
  local code=$?
  echo "❌ ${CURRENT_STEP} failed (exit ${code})"
  exit "${code}"
}
trap on_err ERR

ensure_command() {
  local name="$1"
  shift
  if command -v "$name" >/dev/null 2>&1; then
    return 0
  fi
  for candidate in "$@"; do
    if [[ -x "$candidate" ]]; then
      export PATH="$(dirname "$candidate"):$PATH"
      return 0
    fi
  done
  return 1
}

CURRENT_STEP="markdownlint"
echo "▶️  ${CURRENT_STEP}"
npm run lint:md
echo "✅ ${CURRENT_STEP}"

if ! ensure_command vale \
  "$HOME/.local/bin/vale" \
  "/usr/local/bin/vale" \
  "/opt/homebrew/bin/vale"; then
  echo "❌ Missing required command: vale"
  echo "   Install Vale: brew install vale"
  exit 1
fi

CURRENT_STEP="Vale"
echo "▶️  ${CURRENT_STEP}"
vale sync
if ! find . -type f -name '*.md' \
  ! -path './node_modules/*' \
  ! -path './docs/sdk/*' \
  ! -path './docs/api-site/*' \
  ! -path './.cursor/*' \
  ! -path './.git/*' \
  -print -quit | grep -q .; then
  echo "❌ No Markdown files found to lint."
  exit 1
fi
find . -type f -name '*.md' \
  ! -path './node_modules/*' \
  ! -path './docs/sdk/*' \
  ! -path './docs/api-site/*' \
  ! -path './.cursor/*' \
  ! -path './.git/*' \
  -print0 | xargs -0 vale
echo "✅ ${CURRENT_STEP}"

if ! ensure_command lychee \
  "$HOME/.local/bin/lychee" \
  "/usr/local/bin/lychee" \
  "/opt/homebrew/bin/lychee"; then
  echo "❌ Missing required command: lychee"
  echo "   Install Lychee: brew install lychee"
  exit 1
fi

CURRENT_STEP="Lychee"
echo "▶️  ${CURRENT_STEP}"
lychee --config .lychee.toml '**/*.md'
echo "✅ ${CURRENT_STEP}"

echo "✅ Validation passed."
# API tests: npm test (or npm run pre-pr). Docs/OpenAPI builds stay on docs:* / pre-pr / CI.
