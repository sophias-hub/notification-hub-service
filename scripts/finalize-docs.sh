#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/generate-docs-meta.sh docs/meta.json

if [[ ! -d docs/sdk ]]; then
  echo "Missing docs/sdk — run npm run docs:sdk first."
  exit 1
fi
if [[ ! -d docs/api-site ]]; then
  echo "Missing docs/api-site — run npm run docs:api:site first."
  exit 1
fi

cp docs/meta.json docs/sdk/meta.json
cp docs/meta.json docs/api-site/meta.json

# Persist “no changelog here” READMEs on publish targets.
cp docs/templates/docs-sdk-README.md docs/sdk/README.md
cp docs/templates/docs-api-README.md docs/api-site/README.md

# Provenance on the SDK index and each language site root pages.
npx tsx scripts/inject-provenance-banner.ts docs/sdk "SDK docs index"
for lang in typescript java python; do
  if [[ -d "docs/sdk/${lang}" ]]; then
    cp docs/meta.json "docs/sdk/${lang}/meta.json"
    npx tsx scripts/inject-provenance-banner.ts "docs/sdk/${lang}" "SDK reference (${lang})"
  fi
done

npx tsx scripts/inject-provenance-banner.ts docs/api-site "API reference"

echo "Docs finalized with provenance metadata and banners."
