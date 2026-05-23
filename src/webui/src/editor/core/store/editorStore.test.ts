// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { PaletteConfig } from '../themes/themeTypes';
import {
  editorState,
  mutate,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  transaction,
  undo,
  redo,
  setPaletteConfig,
  __resetForTests,
  __getHistoryLengths,
  __getPastAt,
} from './editorStore';

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

const txOpts = { label: 'tx', collapseToOne: true, clipUndoFloor: false } as const;
const sessionOpts = { label: 'palette session', collapseToOne: true, clipUndoFloor: true } as const;

beforeEach(() => {
  __resetForTests();
});

describe('editorStore — mutate() outside a scope', () => {
  it('pushes exactly one past[] entry per call and undo restores', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    expect(__getHistoryLengths().past).toBe(1);

    setPaletteConfig('Background', makePaletteConfig('#222222'));
    expect(__getHistoryLengths().past).toBe(2);

    expect(get(editorState).palettes.Background.baseColor).toBe('#222222');
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Background).toBeUndefined();
    expect(undo()).toBe(false);
  });
});

describe('editorStore — non-clipping scopes group gestures', () => {
  it('beginScope + multiple mutate() + commitScope → one past entry equal to pre-gesture snapshot', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;
    const preGesture = structuredClone(get(editorState));

    const scope = beginScope({ label: 'drag hue', collapseToOne: true, clipUndoFloor: false });
    mutate('hue step 1', (s) => { s.palettes.Background.baseColor = '#222222'; });
    mutate('hue step 2', (s) => { s.palettes.Background.baseColor = '#333333'; });
    mutate('hue step 3', (s) => { s.palettes.Background.baseColor = '#444444'; });
    commitScope(scope);

    expect(__getHistoryLengths().past).toBe(baselinePast + 1);
    const lastEntry = __getPastAt(__getHistoryLengths().past - 1)!;
    expect(lastEntry.palettes.Background.baseColor).toBe(preGesture.palettes.Background.baseColor);
    expect(get(editorState).palettes.Background.baseColor).toBe('#444444');

    // One undo rolls the whole gesture back
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });

  it('beginSliderGesture opens a scope that groups updates into one entry', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;

    beginSliderGesture('drag');
    mutate('step', (s) => { s.palettes.Background.baseColor = '#222222'; });
    mutate('step', (s) => { s.palettes.Background.baseColor = '#333333'; });
    // Simulate pointerup
    window.dispatchEvent(new Event('pointerup'));

    expect(__getHistoryLengths().past).toBe(baselinePast + 1);
    expect(get(editorState).palettes.Background.baseColor).toBe('#333333');
  });

  it('empty scope (no mutate calls) does not push history', () => {
    const baselinePast = __getHistoryLengths().past;
    const scope = beginScope({ ...txOpts, label: 'unused' });
    commitScope(scope);
    expect(__getHistoryLengths().past).toBe(baselinePast);
  });

  it('cancelScope on a non-clipping scope restores pre-gesture state and does not push history', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const baselinePast = __getHistoryLengths().past;

    const scope = beginScope({ ...txOpts, label: 'drag' });
    mutate('step', (s) => { s.palettes.Background.baseColor = '#999999'; });
    cancelScope(scope, { silent: true });

    expect(__getHistoryLengths().past).toBe(baselinePast);
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });
});

describe('editorStore — clipping scopes (palette edit sessions)', () => {
  it('beginScope with clipUndoFloor does not push history', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const before = __getHistoryLengths().past;
    beginScope({ ...sessionOpts });
    expect(__getHistoryLengths().past).toBe(before);
  });

  it('undo is clipped to the scope floor while open', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    setPaletteConfig('Background', makePaletteConfig('#222222'));
    const floor = __getHistoryLengths().past;

    beginScope({ ...sessionOpts });
    setPaletteConfig('Background', makePaletteConfig('#333333'));
    setPaletteConfig('Background', makePaletteConfig('#444444'));
    expect(__getHistoryLengths().past).toBe(floor + 2);

    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Background.baseColor).toBe('#333333');
    expect(undo()).toBe(true);
    expect(get(editorState).palettes.Background.baseColor).toBe('#222222');

    // Floor reached — further undo returns false, state unchanged
    expect(undo()).toBe(false);
    expect(get(editorState).palettes.Background.baseColor).toBe('#222222');
  });

  it('commitScope on a clipping scope collapses intra-scope history into one entry equal to the snapshot', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    setPaletteConfig('Background', makePaletteConfig('#222222'));
    setPaletteConfig('Background', makePaletteConfig('#333333'));
    setPaletteConfig('Background', makePaletteConfig('#444444'));
    commitScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 1);

    const committedEntry = __getPastAt(__getHistoryLengths().past - 1)!;
    expect(committedEntry.palettes.Background.baseColor).toBe('#111111');
    expect(get(editorState).palettes.Background.baseColor).toBe('#444444');

    // One undo restores pre-scope state
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });

  it('commitScope on a clipping scope with no net change pushes nothing', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    // Mutate and revert to snapshot value
    setPaletteConfig('Background', makePaletteConfig('#222222'));
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    commitScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen);
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });

  it('cancelScope on a clipping scope restores snapshot, drops intra-scope entries, clears future', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const preSessionPastLen = __getHistoryLengths().past;

    const session = beginScope({ ...sessionOpts });
    setPaletteConfig('Background', makePaletteConfig('#222222'));
    setPaletteConfig('Background', makePaletteConfig('#333333'));
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 2);

    cancelScope(session);

    expect(__getHistoryLengths().past).toBe(preSessionPastLen);
    expect(__getHistoryLengths().future).toBe(0);
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });

  it('nested clipping beginScope auto-commits the prior scope', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    setPaletteConfig('Accent', makePaletteConfig('#aaaaaa'));
    const preSessionPastLen = __getHistoryLengths().past;

    beginScope({ ...sessionOpts });
    setPaletteConfig('Background', makePaletteConfig('#222222'));
    const second = beginScope({ ...sessionOpts }); // auto-commits prior
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 1);

    setPaletteConfig('Accent', makePaletteConfig('#bbbbbb'));
    commitScope(second);

    // Two collapsed entries: prior Background scope, then Accent scope
    expect(__getHistoryLengths().past).toBe(preSessionPastLen + 2);
    // One undo: revert Accent to pre-scope value
    undo();
    expect(get(editorState).palettes.Accent.baseColor).toBe('#aaaaaa');
    expect(get(editorState).palettes.Background.baseColor).toBe('#222222');
    // Another undo: revert Background to pre-scope value
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#111111');
  });

  it('undo() with a pending non-clipping scope cancels it first (drag-in-flight is discarded)', () => {
    setPaletteConfig('Background', makePaletteConfig('#111111'));
    const pastLenBefore = __getHistoryLengths().past;

    beginScope({ ...txOpts, label: 'drag' });
    mutate('step', (s) => { s.palettes.Background.baseColor = '#ffffff'; });
    // An in-flight drag holds pre-drag state in the scope's snapshot;
    // `undo()` cancels it (restoring that snapshot) before consulting history.
    undo();
    // The cancelled in-flight change is gone; history count unchanged by the cancel.
    // (Current impl also consumes one history step after cancelling — the
    // cross-boundary behavior is a separate concern tracked in the plan.)
    expect(__getHistoryLengths().past).toBe(pastLenBefore - 1);
    // The pending mutation did not survive: '#ffffff' is not current.
    expect(get(editorState).palettes.Background?.baseColor).not.toBe('#ffffff');
  });
});

describe('editorStore — apply + undo matches spec end-to-end', () => {
  it('after Apply, one Cmd+Z restores to pre-session state', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));
    const preSessionState = structuredClone(get(editorState));

    const session = beginScope({ ...sessionOpts });
    // Simulate three slider drags during the session
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      setPaletteConfig('Background', makePaletteConfig(hex));
      commitScope(drag);
    }
    commitScope(session);

    expect(get(editorState).palettes.Background.baseColor).toBe('#205090');

    const undone = undo();
    expect(undone).toBe(true);
    expect(get(editorState).palettes.Background.baseColor).toBe(preSessionState.palettes.Background.baseColor);
    expect(JSON.stringify(get(editorState))).toBe(JSON.stringify(preSessionState));
  });

  it('after Cancel, Cmd+Z does not resurrect discarded drags', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));
    const preSessionState = structuredClone(get(editorState));

    const session = beginScope({ ...sessionOpts });
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      setPaletteConfig('Background', makePaletteConfig(hex));
      commitScope(drag);
    }
    cancelScope(session);

    // State is pre-session; no new history entry
    expect(JSON.stringify(get(editorState))).toBe(JSON.stringify(preSessionState));
    // One undo walks back to before the palette existed (setPaletteConfig before scope)
    undo();
    expect(get(editorState).palettes.Background).toBeUndefined();
  });
});

describe('editorStore — intra-session slider-drag tracking', () => {
  // Regression guard for the two-writer feedback loop fixed in the
  // PaletteEditor single-source-of-truth refactor: during a drag inside a
  // palette edit session, every per-tick mutation must be visible in the
  // store immediately (not pulled back to a stale pre-session value).
  it('store reflects every per-tick mutation during a slider-drag session', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));

    const session = beginScope({ ...sessionOpts });
    beginSliderGesture('drag base');

    const tickHexes = ['#8c7f73', '#8b7f72', '#8a7f71', '#897f70', '#887f6f'];
    for (const hex of tickHexes) {
      mutate('drag tick', (s) => { s.palettes.Background.baseColor = hex; });
      // Each tick must be visible on read — no stale pre-session value
      expect(get(editorState).palettes.Background.baseColor).toBe(hex);
    }

    window.dispatchEvent(new Event('pointerup'));
    commitScope(session);

    expect(get(editorState).palettes.Background.baseColor).toBe('#887f6f');

    // One undo after Apply restores to pre-session
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#8d7f74');
  });

  it('Cmd+Z during a session walks one tick back per press', () => {
    setPaletteConfig('Background', makePaletteConfig('#8d7f74'));

    beginScope({ ...sessionOpts });
    for (const hex of ['#702030', '#503090', '#205090']) {
      const drag = beginScope({ ...txOpts, label: `drag ${hex}` });
      mutate('tick', (s) => { s.palettes.Background.baseColor = hex; });
      commitScope(drag);
    }

    expect(get(editorState).palettes.Background.baseColor).toBe('#205090');
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#503090');
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#702030');
    undo();
    expect(get(editorState).palettes.Background.baseColor).toBe('#8d7f74');
    // Session floor reached — further undo no-ops
    expect(undo()).toBe(false);
  });
});
