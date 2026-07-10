#!/usr/bin/env bash
# Ensure the Java modern theme actually applies on JDK 17 Javadoc output.
#
# Javadoc emits extra stylesheets with title="Style" (preferred/alternate sets).
# Some browsers only reliably apply the primary stylesheet.css — so we append the
# theme into stylesheet.css and strip title= from modern-theme links.
set -euo pipefail

JAVA_OUT="${1:?Usage: apply-java-javadoc-theme.sh <docs/sdk/java>}"
THEME_SRC="${2:-}"

if [[ ! -d "$JAVA_OUT" ]]; then
  echo "Java docs output not found: $JAVA_OUT" >&2
  exit 1
fi

# Resolve theme file (JDK 17 root vs newer resource-files/).
THEME=""
for candidate in \
  "${THEME_SRC}" \
  "${JAVA_OUT}/modern-theme.css" \
  "${JAVA_OUT}/resource-files/modern-theme.css"
do
  if [[ -n "${candidate}" && -f "${candidate}" ]]; then
    THEME="$candidate"
    break
  fi
done

if [[ -z "$THEME" ]]; then
  echo "modern-theme.css not found under ${JAVA_OUT}" >&2
  exit 1
fi

# Keep theme at both common paths.
mkdir -p "${JAVA_OUT}/resource-files"
cp "$THEME" "${JAVA_OUT}/modern-theme.css"
cp "$THEME" "${JAVA_OUT}/resource-files/modern-theme.css"

# Append theme (without leading @import — invalid mid-file) into every stylesheet.css.
THEME_BODY="$(python3 - "$THEME" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding="utf-8")
lines = []
for line in text.splitlines():
    if line.strip().startswith("@import"):
        continue
    lines.append(line)
print("\n".join(lines).rstrip() + "\n")
PY
)"

while IFS= read -r sheet; do
  if ! grep -q "Notification Hub Java SDK modern theme" "$sheet"; then
    {
      printf '\n\n/* ==== Notification Hub Java SDK modern theme (baked in) ==== */\n'
      printf '%s' "$THEME_BODY"
    } >> "$sheet"
    echo "Appended theme → ${sheet}"
  else
    echo "Theme already baked → ${sheet}"
  fi
done < <(find "$JAVA_OUT" -type f -name 'stylesheet.css')

# Persistent stylesheet links (no title=) so modern-theme always loads if referenced.
python3 - "$JAVA_OUT" <<'PY'
from pathlib import Path
import re
import sys
root = Path(sys.argv[1])
pat = re.compile(
    r'(<link\b[^>]*href="[^"]*modern-theme\.css"[^>]*)\s+title="Style"',
    re.IGNORECASE,
)
n = 0
for html in root.rglob("*.html"):
    text = html.read_text(encoding="utf-8")
    new, count = pat.subn(r"\1", text)
    if count:
        html.write_text(new, encoding="utf-8")
        n += count
print(f"Stripped title=Style from modern-theme links: {n}")
PY

echo "Java Javadoc theme applied under ${JAVA_OUT}"
