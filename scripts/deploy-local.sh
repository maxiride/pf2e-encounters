#!/usr/bin/env bash
# Deploy this package into a consuming project's node_modules until npm publish is wired up.
#
# Usage:
#   scripts/deploy-local.sh [destination-project-dir]
#   npm run deploy:local -- [destination-project-dir]
#
# Default destination: ../runegoblin-site
#
# Syncs every path listed in package.json "files" (plus package.json itself)
# into <destination>/node_modules/<package-name>/, mirroring an npm install.
# Runs `npm run build:plugin` first so dist-plugin is fresh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DEST_PROJECT="${1:-$REPO_ROOT/../runegoblin-site}"
DEST_PROJECT="$(cd "$DEST_PROJECT" 2>/dev/null && pwd || echo "$DEST_PROJECT")"

PKG_NAME="$(node -p "require('./package.json').name")"
DEST="$DEST_PROJECT/node_modules/$PKG_NAME"

if [ ! -d "$DEST_PROJECT" ]; then
  echo "✗ Destination project not found: $DEST_PROJECT" >&2
  exit 1
fi
if [ ! -d "$DEST_PROJECT/node_modules" ]; then
  echo "✗ $DEST_PROJECT has no node_modules — run npm install in the consumer first" >&2
  exit 1
fi

echo "→ Building plugin (dist-plugin)…"
npm run --silent build:plugin

echo "→ Syncing $PKG_NAME → $DEST"
mkdir -p "$DEST"

# Authoritative list: whatever npm would publish.
PATHS_RAW="$(node -p "require('./package.json').files.concat(['package.json']).join('\n')")"

while IFS= read -r p; do
  [ -z "$p" ] && continue
  if [ ! -e "$p" ]; then
    echo "  (skip) $p — not present in repo"
    continue
  fi
  mkdir -p "$DEST/$(dirname "$p")"
  if [ -d "$p" ]; then
    rsync -a --delete "$p/" "$DEST/$p/"
  else
    rsync -a "$p" "$DEST/$p"
  fi
  echo "  ✓ $p"
done <<< "$PATHS_RAW"

echo "✓ Deployed to $DEST"
echo "  Restart the consumer's dev server if Vite isn't watching node_modules."
