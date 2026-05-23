// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  editorState,
  setComponentAlias,
  componentsToVars,
} from './editorStore';
import { deriveCssVars, __resetRendererCacheForTests } from './editorRenderer';

describe('per-side padding renders through componentsToVars', () => {
  beforeEach(() => {
    // Reset slice
    setComponentAlias('card', '--card-default-header-padding', { kind: 'token', name: '--space-16' });
  });

  it('emits per-side card aliases alongside the parent', () => {
    setComponentAlias('card', '--card-default-header-padding-top', { kind: 'token', name: '--space-6' });
    setComponentAlias('card', '--card-default-header-padding-right', { kind: 'token', name: '--space-48' });
    setComponentAlias('card', '--card-default-header-padding-bottom', { kind: 'token', name: '--space-0' });
    setComponentAlias('card', '--card-default-header-padding-left', { kind: 'token', name: '--space-48' });

    const vars = componentsToVars(get(editorState).components);
    expect(vars['--card-default-header-padding-top']).toBe('var(--space-6)');
    expect(vars['--card-default-header-padding-right']).toBe('var(--space-48)');
    expect(vars['--card-default-header-padding-bottom']).toBe('var(--space-0)');
    expect(vars['--card-default-header-padding-left']).toBe('var(--space-48)');
  });

  it('deriveCssVars includes the per-side aliases', () => {
    setComponentAlias('card', '--card-default-header-padding-top', { kind: 'token', name: '--space-6' });
    const all = deriveCssVars(get(editorState));
    expect(all['--card-default-header-padding-top']).toBe('var(--space-6)');
  });

  it('side aliases land on :root after the renderer subscription fires', () => {
    __resetRendererCacheForTests();
    setComponentAlias('card', '--card-default-header-padding-top', { kind: 'token', name: '--space-6' });
    setComponentAlias('card', '--card-default-header-padding-right', { kind: 'token', name: '--space-48' });
    // The renderer subscribes synchronously at module load and on every store
    // change. A setComponentAlias triggers store.update → subscription fires →
    // setCssVar writes to document.documentElement.style.
    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--card-default-header-padding-top')).toBe('var(--space-6)');
    expect(rootStyle.getPropertyValue('--card-default-header-padding-right')).toBe('var(--space-48)');
  });
});
