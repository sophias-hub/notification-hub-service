#!/usr/bin/env bash
# Local mirror of the CI PR path: validate + test-and-build-docs.
# Skips main-only publish jobs (docs-sdk / docs-api).
# Usage: npm run pre-pr
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CURRENT_STEP="pre-pr"

on_err() {
  local code=$?
  echo "❌ ${CURRENT_STEP} failed (exit ${code})"
  exit "${code}"
}
trap on_err ERR

run_step() {
  CURRENT_STEP="$1"
  shift
  echo "▶️  ${CURRENT_STEP}"
  "$@"
  echo "✅ ${CURRENT_STEP}"
}

run_step "[CI: validate] Markdown / prose / links" npm run validate

run_step "[CI: test-and-build-docs] API tests" npm test

run_step "[CI: test-and-build-docs] OpenAPI generate" npm run docs:api:spec

SWAGGER_SPEC="${ROOT}/docs/api/swagger.json"
run_step "[CI: test-and-build-docs] OpenAPI validate" \
  npx swagger-cli validate "${SWAGGER_SPEC}"

run_step "[CI: test-and-build-docs] SDK docs" npm run docs:sdk

CURRENT_STEP="[CI: test-and-build-docs] API docs site"
echo "▶️  ${CURRENT_STEP}"
# Same behavior as CI: warn when PUBLIC_API_URL is unset (Try it out → localhost).
if [ -z "${PUBLIC_API_URL:-}" ]; then
  echo "⚠️  PUBLIC_API_URL is not set. Swagger Try it out will target localhost."
  echo "   Export PUBLIC_API_URL (e.g. https://notification-hub-service.onrender.com) to match published docs."
else
  echo "   Swagger Try it out target: ${PUBLIC_API_URL}"
fi
npm run docs:api:site
echo "✅ ${CURRENT_STEP}"

run_step "[CI: test-and-build-docs] Finalize docs" npm run docs:finalize

echo "✅ Pre-PR checks passed (CI PR jobs: validate + test-and-build-docs)."
