#!/usr/bin/env bash
# Build TypeScript + Java + Python SDK reference sites into docs/sdk/<lang>/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CURRENT_STEP="docs:sdk"

on_err() {
  local code=$?
  echo "❌ ${CURRENT_STEP} failed (exit ${code})"
  exit "${code}"
}
trap on_err ERR

OUT_ROOT="docs/sdk"
mkdir -p "$OUT_ROOT"

CURRENT_STEP="TypeScript (TypeDoc)"
echo "▶️  ${CURRENT_STEP} → ${OUT_ROOT}/typescript"
npx typedoc
echo "✅ ${CURRENT_STEP}"

CURRENT_STEP="Java (Javadoc)"
echo "▶️  ${CURRENT_STEP} → ${OUT_ROOT}/java"
if ! command -v mvn >/dev/null 2>&1; then
  echo "❌ Missing required command: mvn (Maven)"
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
  echo "❌ Javadoc did not produce ${OUT_ROOT}/java/index.html"
  echo "Contents of ${OUT_ROOT}:"
  find "${OUT_ROOT}" -maxdepth 3 -type f | head -50
  echo "Maven target apidocs (if any):"
  find sdks/java/target -type f -name 'index.html' 2>/dev/null | head -20
  exit 1
fi
echo "✅ ${CURRENT_STEP}"

CURRENT_STEP="Python (pdoc)"
echo "▶️  ${CURRENT_STEP} → ${OUT_ROOT}/python"
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Missing required command: python3"
  exit 1
fi
python3 -m pip install -q pdoc
PYTHONPATH="sdks/python/src${PYTHONPATH:+:$PYTHONPATH}" \
  python3 -m pdoc -o "${OUT_ROOT}/python" notification_hub
echo "✅ ${CURRENT_STEP}"

CURRENT_STEP="SDK docs index"
echo "▶️  ${CURRENT_STEP} → ${OUT_ROOT}/index.html"
cp "${ROOT}/scripts/sdk-docs-index.html" "${OUT_ROOT}/index.html"
cp "${ROOT}/docs/brand/favicon.png" "${OUT_ROOT}/favicon.png"
cp "${ROOT}/docs/brand/favicon.svg" "${OUT_ROOT}/favicon.svg"
# Also place favicons in language subdirs for deep links.
for lang in typescript java python; do
  if [[ -d "${OUT_ROOT}/${lang}" ]]; then
    cp "${ROOT}/docs/brand/favicon.png" "${OUT_ROOT}/${lang}/favicon.png"
    cp "${ROOT}/docs/brand/favicon.svg" "${OUT_ROOT}/${lang}/favicon.svg"
  fi
done
echo "✅ ${CURRENT_STEP}"

# Brand language SDK pages (titles + favicons). Favicons are copied above.
brand_sdk_html() {
  local lang="$1"
  local title="$2"
  local dir="${OUT_ROOT}/${lang}"
  [[ -d "$dir" ]] || return 0
  CURRENT_STEP="Brand ${lang} SDK pages"
  echo "▶️  ${CURRENT_STEP}"
  TITLE="$title" DIR="$dir" python3 - <<'PY'
from pathlib import Path
import os
import re

root = Path(os.environ["DIR"])
title = os.environ["TITLE"]
for html in root.rglob("*.html"):
    text = html.read_text(encoding="utf-8", errors="ignore")
    orig = text
    depth = len(html.relative_to(root).parts) - 1
    prefix = "../" * depth if depth > 0 else "./"
    icon = (
        f'<link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">\n'
        f'<link rel="alternate icon" href="{prefix}favicon.png" type="image/png">'
    )
    if re.search(r"<title>[^<]*</title>", text, flags=re.I):
        text = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", text, count=1, flags=re.I)
    elif re.search(r"<head[^>]*>", text, flags=re.I):
        text = re.sub(r"(<head[^>]*>)", rf"\1\n<title>{title}</title>", text, count=1, flags=re.I)
    if 'rel="icon"' not in text and re.search(r"<head[^>]*>", text, flags=re.I):
        text = re.sub(r"(<head[^>]*>)", rf"\1\n{icon}", text, count=1, flags=re.I)
    if text != orig:
        html.write_text(text, encoding="utf-8")
PY
  echo "✅ ${CURRENT_STEP}"
}

brand_sdk_html typescript "TypeScript SDK Docs | Notification Hub Service"
brand_sdk_html java "Java SDK Docs | Notification Hub Service"
brand_sdk_html python "Python SDK Docs | Notification Hub Service"

CURRENT_STEP="Java Javadoc theme"
echo "▶️  ${CURRENT_STEP}"
chmod +x "${ROOT}/scripts/apply-java-javadoc-theme.sh"
"${ROOT}/scripts/apply-java-javadoc-theme.sh" \
  "${OUT_ROOT}/java" \
  "${ROOT}/sdks/java/src/main/javadoc/modern-theme.css"
echo "✅ ${CURRENT_STEP}"

echo "✅ SDK docs built under ${OUT_ROOT}/"
