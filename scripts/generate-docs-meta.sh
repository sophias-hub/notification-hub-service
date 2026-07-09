#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUTPUT="${1:-docs/meta.json}"
mkdir -p "$(dirname "$OUTPUT")"

SOURCE_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
SOURCE_REF="${GITHUB_REF_NAME:-$(git branch --show-current 2>/dev/null || echo unknown)}"
BUILT_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
NODE_VERSION="$(node --version 2>/dev/null || echo unknown)"
WORKFLOW_RUN="${GITHUB_RUN_ID:-local}"
REPOSITORY="${GITHUB_REPOSITORY:-sophias-hub/notification-hub-service}"

cat > "$OUTPUT" <<EOF
{
  "sourceRepository": "${REPOSITORY}",
  "sourceSha": "${SOURCE_SHA}",
  "sourceRef": "${SOURCE_REF}",
  "builtAt": "${BUILT_AT}",
  "nodeVersion": "${NODE_VERSION}",
  "workflowRunId": "${WORKFLOW_RUN}"
}
EOF

echo "Wrote docs provenance metadata to ${OUTPUT}"
