import type { Migration } from './index';

/**
 * Component-config migration (2026-04-27, segmentedcontrol only): the
 * disabled component state used to be modeled as an interaction state on
 * the default option (`--segmentedcontrol-option-disabled-*`); it's now
 * its own top-level component state (`--segmentedcontrol-disabled-*`).
 *
 * Selected-disabled was briefly introduced as a state then removed — a
 * disabled control can't have a selected option. Selected-hover was also
 * briefly introduced then removed when the editor flattened to a single
 * 4-state list (default/selected/hover/disabled); the selected pill now
 * looks the same regardless of pointer state. Drop the legacy keys on load.
 */
const OPTION_DISABLED_PREFIX = '--segmentedcontrol-option-disabled-';
const DISABLED_PREFIX = '--segmentedcontrol-disabled-';
const SELECTED_DISABLED_PREFIX = '--segmentedcontrol-selected-disabled-';
const SELECTED_HOVER_PREFIX = '--segmentedcontrol-selected-hover-';

export const componentMigration_2026_04_27_segmentedcontrolDisabledFlatten: Migration = {
  id: '2026-04-27-segmentedcontrol-disabled-flatten',
  fromVersion: 1,
  toVersion: 2,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'segmentedcontrol') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [oldKey, value] of Object.entries(rawVars)) {
      let key = oldKey;
      // Drop short-lived selected-disabled tokens (impossible state).
      if (key.startsWith(SELECTED_DISABLED_PREFIX)) continue;
      // Drop short-lived selected-hover tokens (selected pill no longer has
      // a hover variation).
      if (key.startsWith(SELECTED_HOVER_PREFIX)) continue;
      // Move option-disabled-* tokens to disabled-* (component-state level).
      if (key.startsWith(OPTION_DISABLED_PREFIX)) {
        key = DISABLED_PREFIX + key.slice(OPTION_DISABLED_PREFIX.length);
      }
      if (!(key in out)) out[key] = value;
    }
    return out;
  },
};
