// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import PaletteEditor from './PaletteEditor.svelte';
import {
  editorState,
  mutate,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  setPaletteConfig,
  undo,
  __resetForTests,
} from '../core/store/editorStore';
import type { PaletteConfig } from '../core/themes/themeTypes';
import { mount, unmount } from "svelte";

function makePaletteConfig(baseColor: string): PaletteConfig {
  return {
    baseColor,
    tintHue: 0,
    tintChroma: 0.04,
    lightnessCurve: [],
    saturationCurve: [],
    grayLightnessCurve: [],
    graySaturationCurve: [],
    scaleCurves: {},
    curveOffset: {},
    overrides: {},
    snappedScales: [],
  };
}

const sessionOpts = { label: 'palette session', collapseToOne: true, clipUndoFloor: true } as const;

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
});

describe('PaletteEditor — store-first integration', () => {
  // Mounts the real component to exercise the $: derivations off the store
  // and prove the sync/auto-persist round-trip has been removed. If the
  // previous two-writer loop were reintroduced, per-tick mutations during a
  // session would be pulled back to the pre-session snapshot — this test
  // would fail.
  it('mounts against the editor store without throwing', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Background', initialColor: '#8d7f74', mode: 'chromatic' },
        });

    expect(get(editorState).palettes.Background.baseColor).toBe('#8d7f74');
    unmount(component);
  });

  it('per-tick store mutations are visible immediately during a session', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Background', initialColor: '#8d7f74', mode: 'chromatic' },
        });

    const session = beginScope({ ...sessionOpts });
    beginSliderGesture('drag base');

    for (const hex of ['#8c7f73', '#8b7f72', '#8a7f71']) {
      mutate('drag tick', (s) => { s.palettes.Background.baseColor = hex; });
      expect(get(editorState).palettes.Background.baseColor).toBe(hex);
    }

    window.dispatchEvent(new Event('pointerup'));
    commitScope(session);

    expect(get(editorState).palettes.Background.baseColor).toBe('#8a7f71');

    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#8d7f74');

    unmount(component);
  });

  it('cancel after drag snaps the store back to pre-session', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(PaletteEditor, {
          target,
          props: { label: 'Background', initialColor: '#8d7f74', mode: 'chromatic' },
        });

    const session = beginScope({ ...sessionOpts });
    mutate('drag', (s) => { s.palettes.Background.baseColor = '#112233'; });
    cancelScope(session);

    expect(get(editorState).palettes.Background.baseColor).toBe('#8d7f74');
    unmount(component);
  });
});
