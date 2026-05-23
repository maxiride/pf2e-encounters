/**
 * Columns slice — fixed-shape (count/maxWidth/gutter/margin) state, derived to
 * four CSS vars. Values default to a 12-column 1440px grid; while state matches
 * the default we leave tokens.css in charge so the `clamp()` in
 * `--columns-gutter` survives until the editor overrides it.
 */
import type { ColumnsState } from '../../store/editorTypes';

export const DEFAULT_COLUMNS: ColumnsState = { count: 12, maxWidth: 1440, gutter: 16, margin: 0 };

export const COLUMN_VAR_NAMES = ['--columns-count', '--columns-max-width', '--columns-gutter', '--columns-margin'] as const;

export function columnsToVars(c: ColumnsState): Record<string, string> {
  return {
    '--columns-count': String(c.count),
    '--columns-max-width': `${c.maxWidth}px`,
    '--columns-gutter': `${c.gutter}px`,
    '--columns-margin': `${c.margin}px`,
  };
}

/**
 * Only emit column CSS vars once the user has actually modified columns.
 * While columns match the default, we leave tokens.css in charge — which
 * preserves the `clamp()` in `--columns-gutter` until the editor overrides it.
 */
export function columnsEqualsDefault(c: ColumnsState): boolean {
  return c.count === DEFAULT_COLUMNS.count
    && c.maxWidth === DEFAULT_COLUMNS.maxWidth
    && c.gutter === DEFAULT_COLUMNS.gutter
    && c.margin === DEFAULT_COLUMNS.margin;
}

export function parseColumnVars(vars: Record<string, string>): Partial<ColumnsState> {
  const out: Partial<ColumnsState> = {};
  const count = parseInt(vars['--columns-count'] ?? '', 10);
  if (Number.isFinite(count) && count > 0) out.count = count;
  const maxWidth = parseFloat(vars['--columns-max-width'] ?? '');
  if (Number.isFinite(maxWidth)) out.maxWidth = Math.round(maxWidth);
  const gutter = parseFloat(vars['--columns-gutter'] ?? '');
  if (Number.isFinite(gutter)) out.gutter = Math.round(gutter);
  const margin = parseFloat(vars['--columns-margin'] ?? '');
  if (Number.isFinite(margin)) out.margin = Math.round(margin);
  return out;
}

/**
 * Loader: route the relevant entries from a freshly-loaded theme's vars bag
 * into `next.columns` and remove them from the bag so derivation stays
 * single-source. Mutates `next` and `rawVars` in place.
 */
export function loadColumnsFromVars(
  next: import('../../store/editorTypes').EditorState,
  rawVars: Record<string, string>,
): void {
  const overrides = parseColumnVars(rawVars);
  next.columns = { ...DEFAULT_COLUMNS, ...overrides };
  for (const name of COLUMN_VAR_NAMES) delete rawVars[name];
}
