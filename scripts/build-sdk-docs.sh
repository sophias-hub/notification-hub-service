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
cp "${ROOT}/docs/brand/favicon.png" "${OUT_ROOT}/favicon.png"
cp "${ROOT}/docs/brand/favicon.svg" "${OUT_ROOT}/favicon.svg"
# Also place favicons in language subdirs for deep links.
for lang in typescript java python; do
  if [[ -d "${OUT_ROOT}/${lang}" ]]; then
    cp "${ROOT}/docs/brand/favicon.png" "${OUT_ROOT}/${lang}/favicon.png"
    cp "${ROOT}/docs/brand/favicon.svg" "${OUT_ROOT}/${lang}/favicon.svg"
  fi
done

# Python pdoc titles default to module name — normalize browser tabs + favicon.
if [[ -d "${OUT_ROOT}/python" ]]; then
  echo "==> Brand Python SDK page titles + favicon"
  python3 - <<'PY'
from pathlib import Path
root = Path("docs/sdk/python")
title = "Python SDK Docs | Notification Hub Service"
icon = '<link rel="icon" href="./favicon.svg" type="image/svg+xml">\n<link rel="alternate icon" href="./favicon.png" type="image/png">'
for html in root.rglob("*.html"):
    text = html.read_text(encoding="utf-8")
    orig = text
    # Replace existing title tags
    import re
    text = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", text, count=1, flags=re.I)
    if "<title>" not in text.lower() and "<head" in text.lower():
        text = re.sub(r"(<head[^>]*>)", rf"\1\n<title>{title}</title>", text, count=1, flags=re.I)
    if 'rel="icon"' not in text and "<head" in text.lower():
        text = re.sub(r"(<head[^>]*>)", rf"\1\n{icon}", text, count=1, flags=re.I)
    if text != orig:
        html.write_text(text, encoding="utf-8")
PY
fi

# Inject favicon into Java HTML if windowtitle pages lack one.
if [[ -d "${OUT_ROOT}/java" ]]; then
  echo "==> Inject favicon into Java SDK HTML"
  python3 - <<'PY'
from pathlib import Path
import re
root = Path("docs/sdk/java")
icon = '<link rel="icon" href="./favicon.svg" type="image/svg+xml">\n<link rel="alternate icon" href="./favicon.png" type="image/png">'
for html in root.rglob("*.html"):
    text = html.read_text(encoding="utf-8", errors="ignore")
    if 'rel="icon"' in text or "<head" not in text.lower():
        continue
    # Nested package pages need relative path to java root favicon
    depth = len(html.relative_to(root).parts) - 1
    prefix = "../" * depth if depth > 0 else "./"
    tag = icon.replace("./", prefix)
    text2 = re.sub(r"(<head[^>]*>)", rf"\1\n{tag}", text, count=1, flags=re.I)
    if text2 != text:
        html.write_text(text2, encoding="utf-8")
PY
fi

echo "==> Apply Java Javadoc theme (bake into stylesheet.css)"
chmod +x "${ROOT}/scripts/apply-java-javadoc-theme.sh"
"${ROOT}/scripts/apply-java-javadoc-theme.sh" \
  "${OUT_ROOT}/java" \
  "${ROOT}/sdks/java/src/main/javadoc/modern-theme.css"

echo "SDK docs built under ${OUT_ROOT}/"
