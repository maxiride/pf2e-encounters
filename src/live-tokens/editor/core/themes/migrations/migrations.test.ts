import { describe, expect, it } from 'vitest';
import {
  CURRENT_THEME_SCHEMA_VERSION,
  CURRENT_COMPONENT_SCHEMA_VERSION,
  runMigrations,
} from './index';

describe('migration runner — schemaVersion gating', () => {
  it('CURRENT_*_SCHEMA_VERSION are positive (at least one migration registered each)', () => {
    expect(CURRENT_THEME_SCHEMA_VERSION).toBeGreaterThan(0);
    expect(CURRENT_COMPONENT_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it('legacy theme (schemaVersion: 0) → bg/canvas + legacy-key renames applied; resaved file matches modern shape', () => {
    const legacy = {
      // bg → canvas pattern (exact match + boundary suffix)
      '--surface-bg': '#fff',
      '--text-bg': '#000',
      '--border-bg-strong': '#888',
      // explicit legacy renames
      '--empty': '#111',
      '--empty-attachment': 'fixed',
      // orphan token (silent drop)
      '--border-neutral': '#ccc',
      // unrelated key passes through
      '--text-primary': '#333',
    };
    const migrated = runMigrations('theme', 0, legacy);
    expect(migrated['--surface-canvas']).toBe('#fff');
    expect(migrated['--text-canvas']).toBe('#000');
    expect(migrated['--border-canvas-strong']).toBe('#888');
    expect(migrated['--page-bg']).toBe('#111');
    expect(migrated['--page-bg-attachment']).toBe('fixed');
    expect(migrated['--border-neutral']).toBeUndefined();
    expect(migrated['--text-primary']).toBe('#333');
    // The "drop" old keys are gone
    expect(migrated['--surface-bg']).toBeUndefined();
    expect(migrated['--empty']).toBeUndefined();
  });

  it('file already at current theme version → no migrations run (passthrough)', () => {
    const modern = { '--surface-canvas': '#fff', '--text-primary': '#333' };
    const out = runMigrations('theme', CURRENT_THEME_SCHEMA_VERSION, modern);
    expect(out).toEqual(modern);
    // identity-preserved values
    expect(out['--surface-canvas']).toBe('#fff');
  });

  it('legacy component-config (schemaVersion: 0) → prefix + suffix renames; segmentedcontrol option-disabled flatten', () => {
    const legacy = {
      // abbreviated prefix
      '--segment-option-bg': '#eee',
      // segmentedcontrol option-disabled → disabled flatten
      '--segmentedcontrol-option-disabled-text': '#999',
      // selected-disabled is dropped (impossible state)
      '--segmentedcontrol-selected-disabled-bg': 'red',
      // selected-hover is dropped
      '--segmentedcontrol-selected-hover-bg': 'blue',
      // unrelated key
      '--segment-track-radius': '4px',
    };
    const migrated = runMigrations('component-config', 0, legacy, {
      component: 'segmentedcontrol',
    });
    // Prefix renamed, then option-disabled flattened... actually option-disabled
    // was already on the long-form name, so it goes through the flatten step.
    expect(migrated['--segmentedcontrol-option-bg']).toBe('#eee');
    expect(migrated['--segmentedcontrol-disabled-text']).toBe('#999');
    expect(migrated['--segmentedcontrol-selected-disabled-bg']).toBeUndefined();
    expect(migrated['--segmentedcontrol-selected-hover-bg']).toBeUndefined();
    expect(migrated['--segmentedcontrol-track-radius']).toBe('4px');
  });

  it('component-config file at version 1 → only the >=1 migrations run (segmentedcontrol flatten only)', () => {
    const v1 = {
      // Already on long-form prefix; v1 → v2 step still applies for sc
      '--segmentedcontrol-option-disabled-text': '#999',
      // suffix-rename rules from v0→v1 should NOT re-apply; abbreviated keys
      // present at v1 are user-authored and untouched
      '--segment-something': 'should-pass-through',
    };
    const migrated = runMigrations('component-config', 1, v1, {
      component: 'segmentedcontrol',
    });
    expect(migrated['--segmentedcontrol-disabled-text']).toBe('#999');
    // v0→v1 prefix rename did NOT re-run
    expect(migrated['--segment-something']).toBe('should-pass-through');
    expect(migrated['--segmentedcontrol-something']).toBeUndefined();
  });

  it('component-config at version 2 → collapsiblesection state tokens namespace into container; v3→v4 cleanup applies on top', () => {
    const v2 = {
      '--collapsiblesection-default-surface': '--surface-canvas-high',
      '--collapsiblesection-hover-icon': '--text-primary',
      '--collapsiblesection-active-border': '--color-primary-400',
      '--collapsiblesection-expanded-padding': '--space-4',
      '--collapsiblesection-default-label-font-family': '--font-sans',
    };
    const migrated = runMigrations('component-config', 2, v2, {
      component: 'collapsiblesection',
    });
    // Old, unscoped keys are gone after v2→v3
    expect(migrated['--collapsiblesection-default-surface']).toBeUndefined();
    expect(migrated['--collapsiblesection-hover-icon']).toBeUndefined();
    // Surviving header tokens land in the container namespace
    expect(migrated['--collapsiblesection-container-default-surface']).toBe('--surface-canvas-high');
    expect(migrated['--collapsiblesection-container-hover-icon']).toBe('--text-primary');
    expect(migrated['--collapsiblesection-container-default-label-font-family']).toBe('--font-sans');
    expect(migrated['--collapsiblesection-container-expanded-padding']).toBe('--space-4');
    // v3→v4 drops container active-border (frame owns chrome now); v6→v7
    // drops frame-surface (it only ever painted a confusing border ring).
    expect(migrated['--collapsiblesection-container-active-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-frame-surface']).toBeUndefined();
  });

  it('component-config v2 namespace migration only fires for collapsiblesection', () => {
    const v2 = { '--button-primary-surface': '--surface-success' };
    const out = runMigrations('component-config', 2, v2, { component: 'button' });
    expect(out).toEqual(v2);
  });

  it('component-config at version 3 → collapsiblesection container chrome moves into frame, dead per-state tokens drop', () => {
    const v3 = {
      // Container default-state chrome → frame (values preserved).
      '--collapsiblesection-container-default-surface': '--surface-canvas-high',
      '--collapsiblesection-container-default-border': '--color-primary-400',
      '--collapsiblesection-container-default-border-width': '--border-width-3',
      '--collapsiblesection-container-default-radius': '--radius-md',
      '--collapsiblesection-container-default-padding': '--space-4',
      // Container hover/active border tokens drop (frame owns chrome).
      '--collapsiblesection-container-hover-border': '--color-primary-500',
      '--collapsiblesection-container-hover-border-width': '--border-width-3',
      '--collapsiblesection-container-active-radius': '--radius-md',
      '--collapsiblesection-container-active-surface': '--surface-canvas-low',
      // Chromeless per-state border / radius drop.
      '--collapsiblesection-chromeless-default-border': '--color-primary-400',
      '--collapsiblesection-chromeless-hover-border-width': '--border-width-1',
      '--collapsiblesection-chromeless-active-radius': '--radius-none',
      '--collapsiblesection-chromeless-default-padding': '--space-4',
      // Divider radius drops; divider border-* survives (paints bottom rule).
      '--collapsiblesection-divider-default-border': '--border-neutral-faint',
      '--collapsiblesection-divider-default-border-width': '--border-width-1',
      '--collapsiblesection-divider-default-radius': '--radius-none',
      // Expanded panel: only padding for chromeless/divider; surface + padding for container.
      '--collapsiblesection-chromeless-expanded-border': '--color-primary-400',
      '--collapsiblesection-chromeless-expanded-surface': '--surface-canvas',
      '--collapsiblesection-chromeless-expanded-padding': '--space-4',
      '--collapsiblesection-container-expanded-radius': '--radius-md',
      '--collapsiblesection-container-expanded-surface': '--surface-canvas-low',
      '--collapsiblesection-container-expanded-padding': '--space-4',
    };
    const migrated = runMigrations('component-config', 3, v3, {
      component: 'collapsiblesection',
    });
    // Container frame-* seeded from old default-state tokens. v5→v6 rewrites
    // `--color-primary-*` to `--color-brand-*`. v6→v7 drops frame-surface
    // entirely (Frame is chrome-only now).
    expect(migrated['--collapsiblesection-container-frame-surface']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-frame-border']).toBe('--color-brand-400');
    expect(migrated['--collapsiblesection-container-frame-border-width']).toBe('--border-width-3');
    expect(migrated['--collapsiblesection-container-frame-radius']).toBe('--radius-md');
    // Container default-state surface + padding survive (still drive header strip)
    expect(migrated['--collapsiblesection-container-default-surface']).toBe('--surface-canvas-high');
    expect(migrated['--collapsiblesection-container-default-padding']).toBe('--space-4');
    // Container default-state border / radius dropped (frame owns them now)
    expect(migrated['--collapsiblesection-container-default-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-default-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-default-radius']).toBeUndefined();
    // Container hover/active border tokens dropped
    expect(migrated['--collapsiblesection-container-hover-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-hover-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-active-radius']).toBeUndefined();
    // Container hover/active surface survives (header strip)
    expect(migrated['--collapsiblesection-container-active-surface']).toBe('--surface-canvas-low');
    // Chromeless per-state border / radius dropped; padding stays
    expect(migrated['--collapsiblesection-chromeless-default-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-hover-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-active-radius']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-default-padding']).toBe('--space-4');
    // Divider border / border-width survive; radius drops
    expect(migrated['--collapsiblesection-divider-default-border']).toBe('--border-neutral-faint');
    expect(migrated['--collapsiblesection-divider-default-border-width']).toBe('--border-width-1');
    expect(migrated['--collapsiblesection-divider-default-radius']).toBeUndefined();
    // Expanded panel cleanup
    expect(migrated['--collapsiblesection-chromeless-expanded-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-expanded-surface']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-expanded-padding']).toBe('--space-4');
    expect(migrated['--collapsiblesection-container-expanded-radius']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-expanded-surface']).toBe('--surface-canvas-low');
    expect(migrated['--collapsiblesection-container-expanded-padding']).toBe('--space-4');
  });

  it('component-config at version 4 → sectiondivider gradient stops strip end-to-end', () => {
    // The full migration chain now ends at v7 which strips the 7 flat
    // gradient tokens (they live in-memory as a structured gradient ref
    // synthesized by `migrateComponentAliases` before the runner fires —
    // see `editorStore.ts:synthesizeSectionDividerGradients`). Within the
    // runner, the only externally observable post-condition is that the
    // flat tokens are gone and unrelated tokens are preserved.
    const v4 = {
      '--sectiondivider-canvas-padding': '--space-16',
      '--sectiondivider-canvas-gradient-stop-1': '--surface-canvas-highest',
      '--sectiondivider-canvas-gradient-stop-2': '--surface-canvas-higher',
      '--sectiondivider-canvas-gradient-stop-3': '--surface-canvas-high',
      '--sectiondivider-canvas-gradient-stop-4': '--surface-canvas',
      '--sectiondivider-primary-gradient-stop-1': '--color-primary-300',
      '--sectiondivider-primary-gradient-stop-2': '--color-primary-500',
      '--sectiondivider-primary-gradient-stop-4': '--color-primary-800',
    };
    const migrated = runMigrations('component-config', 4, v4, { component: 'sectiondivider' });
    // Old v4 keys gone (stripped by v4→v5).
    expect(migrated['--sectiondivider-canvas-gradient-stop-1']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-3']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-4']).toBeUndefined();
    // Intermediate v5 keys (`-stop-{n}-color/position`, `-angle`) also gone — the
    // v6→v7 strip pulls them out so the disk shape can carry the structured ref.
    expect(migrated['--sectiondivider-canvas-gradient-angle']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-1-color']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-2-color']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-3-color']).toBeUndefined();
    expect(migrated['--sectiondivider-primary-gradient-stop-1-color']).toBeUndefined();
    // v8→v9 collapses families to size variants; canvas's padding seeds all three.
    expect(migrated['--sectiondivider-canvas-padding']).toBeUndefined();
    expect(migrated['--sectiondivider-lg-padding']).toBe('--space-16');
    expect(migrated['--sectiondivider-md-padding']).toBe('--space-16');
    expect(migrated['--sectiondivider-sm-padding']).toBe('--space-16');
  });

  it('component-config v4 sectiondivider migration only fires for sectiondivider', () => {
    // Use a value not in the brand-rename map so the v5→v6 step is also a no-op.
    const v4 = { '--button-primary-gradient-stop-1': '--surface-accent' };
    const out = runMigrations('component-config', 4, v4, { component: 'button' });
    expect(out).toEqual(v4);
  });

  it('component-config v8 strip leaves non-gradient sectiondivider keys intact', () => {
    // Run from v7 so the only applicable step is the v7→v8 gradient strip.
    const v6 = {
      '--sectiondivider-canvas-padding': '--space-16',
      '--sectiondivider-canvas-title': '--text-primary',
      '--sectiondivider-canvas-gradient-angle': '--gradient-angle-horizontal',
      '--sectiondivider-canvas-gradient-stop-1-color': '--color-brand-200',
      '--sectiondivider-canvas-gradient-stop-1-position': '10%',
      '--sectiondivider-canvas-gradient-stop-2-color': '--color-brand-500',
      '--sectiondivider-canvas-gradient-stop-2-position': '40%',
      '--sectiondivider-canvas-gradient-stop-3-color': '--color-brand-900',
      '--sectiondivider-canvas-gradient-stop-3-position': '85%',
    };
    const out = runMigrations('component-config', 7, v6, { component: 'sectiondivider' });
    // Padding fans across the three new size variants;
    // canvas's text colors seed all three variants' title color.
    expect(out['--sectiondivider-canvas-padding']).toBeUndefined();
    expect(out['--sectiondivider-md-padding']).toBe('--space-16');
    expect(out['--sectiondivider-md-title']).toBe('--text-primary');
    // The 7 flat gradient tokens are gone — they live in the structured
    // ref synthesized upstream of the runner now.
    expect(out['--sectiondivider-canvas-gradient-angle']).toBeUndefined();
    expect(out['--sectiondivider-canvas-gradient-stop-1-color']).toBeUndefined();
    expect(out['--sectiondivider-canvas-gradient-stop-1-position']).toBeUndefined();
    expect(out['--sectiondivider-canvas-gradient-stop-2-color']).toBeUndefined();
    expect(out['--sectiondivider-canvas-gradient-stop-3-position']).toBeUndefined();
  });

  it('component-config at current version → no migrations run', () => {
    const current = { '--button-primary-surface': '--surface-success' };
    const out = runMigrations(
      'component-config',
      CURRENT_COMPONENT_SCHEMA_VERSION,
      current,
      { component: 'button' },
    );
    expect(out).toEqual(current);
  });

  it('theme v1 → v2 primary→brand: brand family keys renamed, neutral --text-primary untouched', () => {
    const v1 = {
      '--color-primary-100': '#ffe6f9',
      '--color-primary-500': '#eb0ad4',
      '--surface-primary': '#55004c',
      '--surface-primary-high': '#6c0061',
      '--border-primary': '#b200a0',
      '--border-primary-strong': '#ff90eb',
      '--text-primary-color': '#ff8eeb',
      '--text-primary-secondary': '#fe5be7',
      // Neutral text ramp — must NOT be touched.
      '--text-primary': '#fff5f0',
      '--text-secondary': '#b0a9a4',
      // Component variant — also must NOT be touched.
      '--button-primary-surface': '#abc123',
    };
    const out = runMigrations('theme', 1, v1);
    // Brand family renamed.
    expect(out['--color-brand-100']).toBe('#ffe6f9');
    expect(out['--color-brand-500']).toBe('#eb0ad4');
    expect(out['--surface-brand']).toBe('#55004c');
    expect(out['--surface-brand-high']).toBe('#6c0061');
    expect(out['--border-brand']).toBe('#b200a0');
    expect(out['--border-brand-strong']).toBe('#ff90eb');
    expect(out['--text-brand']).toBe('#ff8eeb');
    expect(out['--text-brand-secondary']).toBe('#fe5be7');
    // Old keys gone.
    expect(out['--color-primary-100']).toBeUndefined();
    expect(out['--surface-primary']).toBeUndefined();
    expect(out['--border-primary']).toBeUndefined();
    expect(out['--text-primary-color']).toBeUndefined();
    expect(out['--text-primary-secondary']).toBeUndefined();
    // Neutral text + component variants survive verbatim.
    expect(out['--text-primary']).toBe('#fff5f0');
    expect(out['--text-secondary']).toBe('#b0a9a4');
    expect(out['--button-primary-surface']).toBe('#abc123');
  });

  it('component-config v5 → v6 primary→brand: rewrites alias keys AND values; component variants untouched', () => {
    const v5 = {
      // Brand family on the alias key side (rare but possible).
      '--text-primary-color': '#fff',
      // Brand family on the value side (common: component aliases to family token).
      '--badge-trait-surface': '--surface-primary',
      '--badge-trait-text': '--text-primary-color',
      '--badge-trait-border': '--border-primary-medium',
      // Component variant token — name should NOT change.
      '--button-primary-surface': '--surface-brand-high',
      // Neutral text — value should NOT change.
      '--card-default-title': '--text-primary',
      // Unrelated key/value pair.
      '--card-hover-title': '--text-secondary',
    };
    const out = runMigrations('component-config', 5, v5, { component: 'badge' });
    expect(out['--text-brand']).toBe('#fff');
    expect(out['--text-primary-color']).toBeUndefined();
    expect(out['--badge-trait-surface']).toBe('--surface-brand');
    expect(out['--badge-trait-text']).toBe('--text-brand');
    expect(out['--badge-trait-border']).toBe('--border-brand-medium');
    // Component variant identifier (LHS) is preserved; its value is not in the
    // rename map so it passes through.
    expect(out['--button-primary-surface']).toBe('--surface-brand-high');
    // Neutral text value preserved.
    expect(out['--card-default-title']).toBe('--text-primary');
    expect(out['--card-hover-title']).toBe('--text-secondary');
  });

  it('runMigrations is pure — does not mutate the input map', () => {
    const input = { '--surface-bg': '#fff' };
    const before = { ...input };
    runMigrations('theme', 0, input);
    expect(input).toEqual(before);
  });

  it('component-config v8 → v9 sectiondivider: collapse 6 color families to 3 size variants seeded from canvas', () => {
    const v8 = {
      '--sectiondivider-canvas-padding': '--space-16',
      '--sectiondivider-canvas-title': '--text-primary',
      '--sectiondivider-canvas-title-font-family': '--font-display',
      '--sectiondivider-canvas-title-font-size': '--font-size-5xl',
      '--sectiondivider-canvas-title-border-width': '--border-width-4',
      '--sectiondivider-canvas-title-stroke-color': '--surface-canvas-lowest',
      '--sectiondivider-canvas-description': '--text-secondary',
      '--sectiondivider-canvas-radius': '--radius-lg',
      '--sectiondivider-canvas-shadow': '--shadow-none',
      // Non-canvas family customisations are dropped — the new variant axis
      // is size, not color, and canvas is the canonical seed.
      '--sectiondivider-accent-title': '--text-brand',
      '--sectiondivider-special-radius': '--radius-3xl',
    };
    const out = runMigrations('component-config', 8, v8, { component: 'sectiondivider' });

    // Every per-family token is gone (canvas included — replaced by per-variant entries).
    expect(out['--sectiondivider-canvas-title']).toBeUndefined();
    expect(out['--sectiondivider-canvas-padding']).toBeUndefined();
    expect(out['--sectiondivider-accent-title']).toBeUndefined();
    expect(out['--sectiondivider-special-radius']).toBeUndefined();

    // Canvas's values are fanned across lg/md/sm with the suffix renames applied.
    for (const v of ['lg', 'md', 'sm']) {
      expect(out[`--sectiondivider-${v}-padding`]).toBe('--space-16'); // v8→v9 intermediate -spacing, then v9→v10 back to -padding
      expect(out[`--sectiondivider-${v}-title`]).toBe('--text-primary');
      expect(out[`--sectiondivider-${v}-title-font-family`]).toBe('--font-display');
      expect(out[`--sectiondivider-${v}-title-font-size`]).toBe('--font-size-5xl');
      expect(out[`--sectiondivider-${v}-title-outline-width`]).toBe('--border-width-4'); // renamed from -title-border-width
      expect(out[`--sectiondivider-${v}-title-outline-color`]).toBe('--surface-canvas-lowest'); // renamed from -title-stroke-color
      expect(out[`--sectiondivider-${v}-description`]).toBe('--text-secondary');
      expect(out[`--sectiondivider-${v}-radius`]).toBe('--radius-lg');
      expect(out[`--sectiondivider-${v}-shadow`]).toBe('--shadow-none');
    }
  });

  it('component-config v8 → v9 only fires for sectiondivider', () => {
    const v8 = { '--badge-trait-title-border-width': '--border-width-2' };
    const out = runMigrations('component-config', 8, v8, { component: 'badge' });
    expect(out).toEqual(v8);
  });
});
