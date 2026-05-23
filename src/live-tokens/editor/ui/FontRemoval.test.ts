// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';

// happy-dom doesn't implement Element.getAnimations() which animate:flip touches.
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  (Element.prototype as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [];
}
import { mount, unmount, flushSync } from 'svelte';
import { get } from 'svelte/store';
import ProjectFontsSection from './ProjectFontsSection.svelte';
import FontStackEditor from './FontStackEditor.svelte';
import {
  editorState,
  seedFontsFromTheme,
  __resetForTests,
} from '../core/store/editorStore';
import type { FontSource, FontStack } from '../core/themes/themeTypes';

// Use font-face sources (no network fetch) so happy-dom doesn't try to reach
// the real Google Fonts CSS endpoint when applyFontSources injects <link> tags.
const sources: FontSource[] = [
  {
    id: 'src_arvo',
    kind: 'font-face',
    label: 'Arvo',
    cssText: '@font-face { font-family: "Arvo"; src: local("Arvo"); }',
    families: [{ id: 'src_arvo:arvo', name: 'Arvo', cssName: '"Arvo"' }],
  },
  {
    id: 'src_inter',
    kind: 'font-face',
    label: 'Inter',
    cssText: '@font-face { font-family: "Inter"; src: local("Inter"); }',
    families: [{ id: 'src_inter:inter', name: 'Inter', cssName: '"Inter"' }],
  },
];

const stacks: FontStack[] = [
  {
    variable: '--font-sans',
    slots: [
      { kind: 'project', familyId: 'src_inter:inter' },
      { kind: 'generic', value: 'sans-serif' },
    ],
  },
];

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  seedFontsFromTheme(sources, stacks);
});

describe('removeFamily X button', () => {
  it('clicking the X removes the family from editor state', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(ProjectFontsSection, { target, props: {} });
    flushSync();

    expect(get(editorState).fonts.sources).toHaveLength(2);

    const removeButtons = target.querySelectorAll<HTMLButtonElement>('button.pf-family-remove');
    expect(removeButtons.length).toBe(2);
    removeButtons[0].click();
    flushSync();

    expect(get(editorState).fonts.sources).toHaveLength(1);
    unmount(component);
  });
});

function sansStackEl(target: HTMLElement): HTMLElement {
  const header = Array.from(target.querySelectorAll('.stack-variable')).find(
    (el) => el.textContent?.trim() === 'Font Sans',
  );
  if (!header) throw new Error('Font Sans header not found');
  return header.closest('.font-stack') as HTMLElement;
}

describe('FontStackEditor removeSlot', () => {
  it('clicking the slot-remove X removes a stack slot (non-terminal only)', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const before = get(editorState).fonts.stacks.find((s) => s.variable === '--font-sans')!;
    expect(before.slots.length).toBe(2);

    // Terminal (sans-serif, bottom) has no X — only the Inter row has one.
    const removes = sansStackEl(target).querySelectorAll<HTMLButtonElement>('button.slot-remove');
    expect(removes.length).toBe(1);

    removes[0].click();
    flushSync();

    const after = get(editorState).fonts.stacks.find((s) => s.variable === '--font-sans')!;
    expect(after.slots.length).toBe(1);
    expect(after.slots[0]).toEqual({ kind: 'generic', value: 'sans-serif' });
    unmount(component);
  });

  it('changing the select replaces the slot', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const selects = sansStackEl(target).querySelectorAll<HTMLSelectElement>('select.slot-select');
    expect(selects.length).toBe(2);

    selects[0].value = 'project:src_arvo:arvo';
    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();

    const after = get(editorState).fonts.stacks.find((s) => s.variable === '--font-sans')!;
    expect(after.slots[0]).toEqual({ kind: 'project', familyId: 'src_arvo:arvo' });
    unmount(component);
  });
});

describe('FontStackEditor terminal fallback', () => {
  it('terminal slot has a lock glyph where the handle was and no X button', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const rows = sansStackEl(target).querySelectorAll<HTMLElement>('.slot-row');
    expect(rows.length).toBe(2);
    const terminal = rows[rows.length - 1];

    expect(terminal.classList.contains('terminal')).toBe(true);
    // No drag-handle on the terminal — the lock glyph takes its place.
    expect(terminal.querySelector('.drag-handle')).toBeNull();
    expect(terminal.querySelector('.slot-locked-glyph')).not.toBeNull();
    // No remove button — the placeholder reserves the column for alignment.
    expect(terminal.querySelector('button.slot-remove')).toBeNull();
    expect(terminal.querySelector('.slot-remove-placeholder')).not.toBeNull();
  });

  it('terminal select offers only the matching system + generic pair', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const rows = sansStackEl(target).querySelectorAll<HTMLElement>('.slot-row');
    const terminal = rows[rows.length - 1];
    const select = terminal.querySelector<HTMLSelectElement>('select.slot-select')!;

    // No optgroups at the terminal — just two flat options.
    expect(select.querySelectorAll('optgroup').length).toBe(0);
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['system:system-ui-sans', 'generic:sans-serif']);
    unmount(component);
  });

  it('non-terminal generic group excludes cursive and fantasy', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const rows = sansStackEl(target).querySelectorAll<HTMLElement>('.slot-row');
    const primary = rows[0]; // Inter slot
    const genericGroup = Array.from(primary.querySelectorAll('optgroup')).find(
      (g) => g.label === 'Generic',
    )!;
    const values = Array.from(genericGroup.querySelectorAll('option')).map((o) => o.value);
    expect(values).toEqual(['generic:sans-serif', 'generic:serif', 'generic:monospace']);
    unmount(component);
  });

  it('addSlot inserts above the terminal so terminal stays at the bottom', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const addBtn = sansStackEl(target).querySelector<HTMLButtonElement>('button.add-fallback')!;
    addBtn.click();
    flushSync();

    const after = get(editorState).fonts.stacks.find((s) => s.variable === '--font-sans')!;
    const last = after.slots[after.slots.length - 1];
    expect(last).toEqual({ kind: 'generic', value: 'sans-serif' });
    expect(after.slots.length).toBe(3);
    unmount(component);
  });
});
