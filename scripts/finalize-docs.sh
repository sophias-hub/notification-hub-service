#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/generate-docs-meta.sh docs/meta.json
cp docs/meta.json docs/sdk/meta.json
cp docs/meta.json docs/api-site/meta.json

npx tsx scripts/inject-provenance-banner.ts docs/sdk "SDK reference"
npx tsx scripts/inject-provenance-banner.ts docs/api-site "API reference"

echo "Docs finalized with provenance metadata and banners."
