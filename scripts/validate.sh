#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

if ! ensure_command vale \
  "$HOME/.local/bin/vale" \
  "/usr/local/bin/vale" \
  "/opt/homebrew/bin/vale"; then
  echo "Missing required command: vale"
  echo "Install Vale: brew install vale"
  exit 1
fi

echo "==> Linting Markdown prose (Vale)"
vale sync
if ! find . -type f -name '*.md' \
  ! -path './node_modules/*' \
  ! -path './docs/sdk/*' \
  ! -path './docs/api-site/*' \
  ! -path './.git/*' \
  -print -quit | grep -q .; then
  echo "No Markdown files found to lint."
  exit 1
fi
find . -type f -name '*.md' \
  ! -path './node_modules/*' \
  ! -path './docs/sdk/*' \
  ! -path './docs/api-site/*' \
  ! -path './.git/*' \
  -print0 | xargs -0 vale

if ! ensure_command lychee \
  "$HOME/.local/bin/lychee" \
  "/usr/local/bin/lychee" \
  "/opt/homebrew/bin/lychee"; then
  echo "Missing required command: lychee"
  echo "Install Lychee: brew install lychee"
  exit 1
fi

echo "==> Checking Markdown links (Lychee)"
lychee --config .lychee.toml '**/*.md'

echo "Validation passed."
