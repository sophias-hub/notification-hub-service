#!/usr/bin/env bash
# Build TypeScript + Java + Python SDK reference sites into docs/sdk/<lang>/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_ROOT="docs/sdk"
mkdir -p "$OUT_ROOT"

echo "==> TypeScript (TypeDoc) → ${OUT_ROOT}/typescript"
npx typedoc

echo "==> Java (Javadoc) → ${OUT_ROOT}/java"
if ! command -v mvn >/dev/null 2>&1; then
  echo "Missing required command: mvn (Maven)"
  exit 1
fi
rm -rf "${OUT_ROOT}/java"
mvn -f sdks/java -q javadoc:javadoc
# Some Maven Javadoc versions nest under apidocs/; flatten for /docs-sdk/java/.
if [[ -f "${OUT_ROOT}/java/apidocs/index.html" && ! -f "${OUT_ROOT}/java/index.html" ]]; then
  shopt -s dotglob nullglob
  mv "${OUT_ROOT}/java/apidocs"/* "${OUT_ROOT}/java/"
  rmdir "${OUT_ROOT}/java/apidocs"
  shopt -u dotglob nullglob
fi
if [[ ! -f "${OUT_ROOT}/java/index.html" ]]; then
  echo "Javadoc did not produce ${OUT_ROOT}/java/index.html"
  echo "Contents of ${OUT_ROOT}:"
  find "${OUT_ROOT}" -maxdepth 3 -type f | head -50
  echo "Maven target apidocs (if any):"
  find sdks/java/target -type f -name 'index.html' 2>/dev/null | head -20
  exit 1
fi

echo "==> Python (pdoc) → ${OUT_ROOT}/python"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Missing required command: python3"
  exit 1
fi
python3 -m pip install -q pdoc
PYTHONPATH="sdks/python/src${PYTHONPATH:+:$PYTHONPATH}" \
  python3 -m pdoc -o "${OUT_ROOT}/python" notification_hub

echo "==> SDK docs index → ${OUT_ROOT}/index.html"
cp "${ROOT}/scripts/sdk-docs-index.html" "${OUT_ROOT}/index.html"

# JDK 17 places addStylesheet CSS at the docs root; newer JDKs use resource-files/.
# Keep both so the theme resolves regardless of the CI JDK.
if [[ -f "${OUT_ROOT}/java/resource-files/modern-theme.css" && ! -f "${OUT_ROOT}/java/modern-theme.css" ]]; then
  cp "${OUT_ROOT}/java/resource-files/modern-theme.css" "${OUT_ROOT}/java/modern-theme.css"
fi
if [[ -f "${OUT_ROOT}/java/modern-theme.css" && ! -f "${OUT_ROOT}/java/resource-files/modern-theme.css" ]]; then
  mkdir -p "${OUT_ROOT}/java/resource-files"
  cp "${OUT_ROOT}/java/modern-theme.css" "${OUT_ROOT}/java/resource-files/modern-theme.css"
fi

echo "SDK docs built under ${OUT_ROOT}/"
