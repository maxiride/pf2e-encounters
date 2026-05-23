#!/usr/bin/env node
// Fail if any editor-namespace CSS references theme-side font tokens.
//
// Editor chrome must use only --ui-font-* (system stack defined in
// ui-editor.css), never --font-sans/--font-serif/--font-display/--font-mono
// from the consumer's theme. A leak here means the editor adopts the
// consumer's brand fonts — the exact bug the v0.6 refactor fixes.
//
// Scanned surfaces:
//   - src/styles/ui-*.css (every editor stylesheet)
//   - <style> blocks in src/pages/Editor.svelte, EditorShell.svelte,
//     ComponentEditorPage.svelte, and everything under src/ui/ and
//     src/component-editor/

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const FORBIDDEN = /var\(\s*--font-(sans|serif|display|mono)\b/g;

const STYLE_FILES = [
  'src/editor/styles/ui-editor.css',
  'src/editor/styles/ui-form-controls.css',
];

async function walk(dir, extFilter) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      out.push(...(await walk(full, extFilter)));
    } else if (extFilter(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

// Editor chrome surfaces. `src/pages` is excluded because it mixes editor
// pages (which we list explicitly) with the themed consumer pages
// `Home.svelte` and `Demo.svelte` (which are *expected* to use theme fonts).
const editorSvelteDirs = [
  'src/editor/ui',
  'src/editor/component-editor',
];
const editorSvelteFiles = [
  'src/editor/pages/Editor.svelte',
  'src/editor/pages/EditorShell.svelte',
  'src/editor/pages/ComponentEditorPage.svelte',
];

const violations = [];

// Pure CSS files
for (const rel of STYLE_FILES) {
  const file = join(ROOT, rel);
  const src = await readFile(file, 'utf8');
  let m;
  while ((m = FORBIDDEN.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length;
    violations.push({ file: rel, line, match: m[0] });
  }
}

// Editor .svelte files — scan only their <style> blocks
const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;

const targets = [];
for (const dir of editorSvelteDirs) {
  targets.push(...(await walk(join(ROOT, dir), (n) => n.endsWith('.svelte'))));
}
for (const rel of editorSvelteFiles) {
  targets.push(join(ROOT, rel));
}

for (const file of targets) {
  const src = await readFile(file, 'utf8');
  let sm;
  while ((sm = STYLE_BLOCK.exec(src)) !== null) {
    const block = sm[1];
    const blockStart = sm.index + sm[0].indexOf(block);
    let fm;
    const localRe = new RegExp(FORBIDDEN.source, 'g');
    while ((fm = localRe.exec(block)) !== null) {
      const abs = blockStart + fm.index;
      const line = src.slice(0, abs).split('\n').length;
      violations.push({ file: relative(ROOT, file), line, match: fm[0] });
    }
  }
}

if (violations.length > 0) {
  console.error('[check-editor-font-isolation] Editor chrome must use --ui-font-* only.');
  console.error('Theme-side font tokens (--font-sans/serif/display/mono) leak the consumer\'s brand fonts.\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.match}…`);
  }
  process.exit(1);
}

console.log('[check-editor-font-isolation] OK — no theme-font tokens in editor namespace.');
