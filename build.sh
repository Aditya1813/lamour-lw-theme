#!/usr/bin/env bash
# Concatenates the source layers into the two files LearnWorlds actually
# loads. Order matters: tokens → base → LearnWorlds overrides → blocks →
# built-in pages. Nothing is minified — the files gzip to a few kB and
# staying readable is worth more than the bytes when you are debugging a
# selector against a live LearnWorlds page in devtools.
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(date -u +%Y.%m.%d.%H%M)"
mkdir -p dist

{
  echo "/*! L'Amour LearnWorlds theme — build $VERSION"
  echo "    Source: ~/dev/lamour-lw-theme/src — edit there, never edit dist/."
  echo "    Design system of record: ~/dev/lamour-website/src/app/globals.css */"
  echo
  for f in src/00-tokens.css src/10-base.css src/20-learnworlds.css src/30-blocks.css src/40-builtin.css; do
    echo "/* ===== $f ===== */"
    cat "$f"
    echo
  done
} > dist/lamour.css

{
  echo "/*! L'Amour LearnWorlds theme — build $VERSION */"
  cat src/lamour.js
} > dist/lamour.js

cp src/50-dynamic-slot.css dist/lamour-dynamic-slot.css

# The exact block to paste into the LearnWorlds head/body slots, stamped with
# this build so the cache-buster is never copied stale. Copy it with:
#   pbcopy < dist/paste-into-learnworlds.html
BASE="https://aditya1813.github.io/lamour-lw-theme/dist"
cat > dist/paste-into-learnworlds.html <<EOF
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f%5B%5D=sentient@300i,500i&f%5B%5D=general-sans@200,300,400,500,600,700&display=swap">
<link rel="stylesheet" href="$BASE/lamour.css?v=$VERSION">
<script defer src="$BASE/lamour.js?v=$VERSION"></script>
EOF
echo "$VERSION" > dist/VERSION

printf 'built dist/lamour.css  %s bytes (%s gzipped)\n' \
  "$(wc -c < dist/lamour.css | tr -d ' ')" \
  "$(gzip -c dist/lamour.css | wc -c | tr -d ' ')"
printf 'built dist/lamour.js   %s bytes (%s gzipped)\n' \
  "$(wc -c < dist/lamour.js | tr -d ' ')" \
  "$(gzip -c dist/lamour.js | wc -c | tr -d ' ')"
printf 'version %s  →  use ?v=%s on the <link>/<script> tags\n' "$VERSION" "$VERSION"

# Assemble the local preview harness from the shell + every block file, so
# the harness can never drift out of sync with the block library.
python3 - <<'PY'
import pathlib
root = pathlib.Path(__file__).resolve().parent if "__file__" in dir() else pathlib.Path.cwd()
shell = (root/"preview/_shell.html").read_text()
blocks = "\n\n".join(p.read_text() for p in sorted((root/"blocks").glob("*.html")))
(root/"preview/index.html").write_text(shell.replace("<!--BLOCKS-->", blocks))
print("built preview/index.html")
PY
