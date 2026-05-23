#!/usr/bin/env node
// Fail if any published .svelte file contains an @import inside a <style> block.
//
// Why: Svelte <style> blocks that @import a sibling CSS file work in the
// library's own dev server but break under consumers using
// `css: 'injected'` (the workaround for the vite-plugin-svelte 6 / vite 7
// ?lang.css race). The @import URL leaks to the browser and 404s against the
// consumer's site root. Editor pages must JS-import editor CSS instead.
//
// This regression killed v0.5.0; the guard exists so it cannot land again.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = join(ROOT, 'src');

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      out.push(...(await walk(full)));
    } else if (ent.name.endsWith('.svelte')) {
      out.push(full);
    }
  }
  return out;
}

const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;
const IMPORT_LINE = /@import\b[^;]*;?/g;

const violations = [];
for (const file of await walk(SCAN)) {
  const src = await readFile(file, 'utf8');
  let m;
  while ((m = STYLE_BLOCK.exec(src)) !== null) {
    const block = m[1];
    const blockStart = m.index + m[0].indexOf(block);
    let im;
    while ((im = IMPORT_LINE.exec(block)) !== null) {
      const absoluteOffset = blockStart + im.index;
      const before = src.slice(0, absoluteOffset);
      const line = before.split('\n').length;
      violations.push({ file: relative(ROOT, file), line, match: im[0].trim() });
    }
  }
}

if (violations.length > 0) {
  console.error('[check-no-style-imports] @import inside <style> blocks is forbidden in published .svelte files.');
  console.error('Use a JS import at the top of the script block instead (see CONVENTIONS.md).\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.match}`);
  }
  process.exit(1);
}

console.log('[check-no-style-imports] OK — no @import found in any <style> block.');
