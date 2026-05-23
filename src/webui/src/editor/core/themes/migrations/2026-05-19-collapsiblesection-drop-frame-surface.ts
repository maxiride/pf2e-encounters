import type { Migration } from './index';

/**
 * 2026-05-19: drop `--collapsiblesection-container-frame-surface`.
 *
 * The frame-surface token only ever painted the outer `.es-root` background.
 * Since `.section-header` covers that area with its own per-state surface, the
 * frame-surface was only visible where the (typically transparent) frame
 * border zone exposed it — a ring around the header. That made the token
 * read as a "border" while being labeled "surface color" in the editor.
 *
 * Frame is now pure chrome: border color, border width, corner radius. The
 * per-state header surface tokens already cover all the legitimate surface
 * needs of the Container variant.
 */
function dropFrameSurface(rawVars: Record<string, string>, meta: { component?: string }): Record<string, string> {
  if (meta.component !== 'collapsiblesection') return rawVars;
  const { '--collapsiblesection-container-frame-surface': _drop, ...rest } = rawVars;
  return rest;
}

export const componentMigration_2026_05_19_collapsiblesectionDropFrameSurface: Migration = {
  id: '2026-05-19-collapsiblesection-drop-frame-surface',
  fromVersion: 6,
  toVersion: 7,
  appliesTo: 'component-config',
  apply: dropFrameSurface,
};
