#!/usr/bin/env bash
# Smoke-test that the published tarball can be installed and built by a
# second, hypothetical consumer with no special vite config.
#
# Pipeline:
#   1. npm pack → tarball
#   2. Set up /tmp/lt-smoke-<ts>/ with minimal package.json, vite.config.ts,
#      App.svelte mounting <Editor />
#   3. npm install ../live-tokens/<tarball>
#   4. npx vite build → must succeed
#
# Wired into prepublishOnly so a broken consumer-facing layout can't ship.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"

echo "→ npm pack ($PKG_NAME@$PKG_VERSION)…"
TARBALL_NAME="$(npm pack --silent)"
TARBALL_PATH="$REPO_ROOT/$TARBALL_NAME"
trap 'rm -f "$TARBALL_PATH"' EXIT

SMOKE_DIR="$(mktemp -d -t lt-smoke-XXXXXX)"
echo "→ Smoke consumer: $SMOKE_DIR"

cat > "$SMOKE_DIR/package.json" <<EOF
{
  "name": "lt-smoke",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "$PKG_NAME": "file:$TARBALL_PATH"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "sass": "^1.98.0",
    "svelte": "^5.55.5",
    "typescript": "~5.9.3",
    "vite": "^7.3.3"
  }
}
EOF

cat > "$SMOKE_DIR/vite.config.ts" <<'EOF'
import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Deliberately NO `css: 'injected'` workaround — a fresh consumer should not
// need it. If the build fails here, the library's CSS isolation is broken.
export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
});
EOF

cat > "$SMOKE_DIR/index.html" <<'EOF'
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>smoke</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF

mkdir -p "$SMOKE_DIR/src"
cat > "$SMOKE_DIR/src/main.ts" <<'EOF'
// Minimum a consumer needs: theme tokens. The editor pages script-import
// their own chrome + icons. Starter fonts.css is deliberately skipped — it's
// optional and its `url()` paths point into the package's own source tree.
import '@motion-proto/live-tokens/app/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
EOF

cat > "$SMOKE_DIR/src/App.svelte" <<'EOF'
<script lang="ts">
  import Editor from '@motion-proto/live-tokens/editor';
</script>

<Editor />
EOF

cat > "$SMOKE_DIR/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": ["svelte"]
  },
  "include": ["src"]
}
EOF

echo "→ Installing tarball + deps…"
# --legacy-peer-deps: svelte-preprocess and vite 7 each declare an optional
# peer on different sugarss majors. Real consumers hit the same conflict and
# resolve it the same way; this isn't masking a library bug.
(cd "$SMOKE_DIR" && npm install --silent --no-audit --no-fund --loglevel=error --legacy-peer-deps)

echo "→ Building consumer…"
(cd "$SMOKE_DIR" && npx --no-install vite build)

echo "✓ Smoke install OK"
rm -rf "$SMOKE_DIR"
