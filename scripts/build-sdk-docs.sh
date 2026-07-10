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
cat > "${OUT_ROOT}/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Notification Hub SDK docs</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem auto; max-width: 42rem; line-height: 1.5; padding: 0 1rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    p { color: #555; }
    ul { padding-left: 1.25rem; }
    a { color: #0b57d0; }
  </style>
</head>
<body>
  <h1>Notification Hub SDK docs</h1>
  <p>Standalone generated reference sites for each language client.</p>
  <ul>
    <li><a href="./typescript/">TypeScript (TypeDoc)</a></li>
    <li><a href="./java/">Java (Javadoc)</a></li>
    <li><a href="./python/">Python (pdoc)</a></li>
  </ul>
  <p>Source: <a href="https://github.com/sophias-hub/notification-hub-service/tree/main/sdks">sdks/</a> in notification-hub-service.</p>
</body>
</html>
EOF

echo "SDK docs built under ${OUT_ROOT}/"
