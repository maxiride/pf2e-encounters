/**
 * Variable-name lists and static utility-token data for the scales rendered
 * in VariablesTab. Pulled out so the parent stays focused on layout +
 * orchestration. Values are resolved live via getComputedStyle inside
 * TokenScaleTable, so tokens.css remains the single source of truth.
 */

export const SPACING_VARS = [
  '--space-2', '--space-4', '--space-6', '--space-8', '--space-10',
  '--space-12', '--space-16', '--space-20', '--space-24', '--space-32',
  '--space-48',
] as const;

export const BORDER_WIDTH_VARS = [
  '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
  '--border-width-4', '--border-width-5', '--border-width-6', '--border-width-8',
  '--border-width-10', '--border-width-12', '--border-width-16', '--border-width-20',
  '--border-width-24',
] as const;

export const RADIUS_VARS = [
  '--radius-none', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
  '--radius-2xl', '--radius-3xl', '--radius-4xl', '--radius-full',
] as const;

export const FONT_SIZE_VARS = [
  '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-lg',
  '--font-size-xl', '--font-size-2xl', '--font-size-3xl', '--font-size-4xl',
  '--font-size-5xl', '--font-size-6xl',
] as const;

export const ICON_SIZE_VARS = [
  '--icon-size-xs', '--icon-size-sm', '--icon-size-md', '--icon-size-lg',
  '--icon-size-xl', '--icon-size-2xl', '--icon-size-3xl', '--icon-size-4xl',
  '--icon-size-5xl', '--icon-size-6xl',
] as const;

export const FONT_WEIGHT_VARS = [
  '--font-weight-thin', '--font-weight-extralight', '--font-weight-light',
  '--font-weight-normal', '--font-weight-medium', '--font-weight-semibold',
  '--font-weight-bold', '--font-weight-extrabold', '--font-weight-black',
] as const;

export const LINE_HEIGHT_VARS = [
  '--line-height-xs', '--line-height-sm', '--line-height-md',
  '--line-height-lg', '--line-height-xl',
] as const;

export interface TokenItem {
  variable: string;
  value: string;
}

/** Static utility tokens — values are baked at the JS layer (not resolved
 *  from CSS) because they're meaningful labels, not the result of computed
 *  CSS lookups. */
export const DURATION_TOKENS: TokenItem[] = [
  { variable: '--duration-75', value: '75ms' },
  { variable: '--duration-150', value: '150ms' },
  { variable: '--duration-200', value: '200ms' },
  { variable: '--duration-300', value: '300ms' },
  { variable: '--duration-500', value: '500ms' },
  { variable: '--duration-750', value: '750ms' },
  { variable: '--duration-1000', value: '1000ms' },
];

export const Z_INDEX_TOKENS: TokenItem[] = [
  { variable: '--z-base', value: '0' },
  { variable: '--z-dropdown', value: '100' },
  { variable: '--z-sticky', value: '200' },
  { variable: '--z-overlay', value: '1000' },
  { variable: '--z-modal', value: '1100' },
  { variable: '--z-popover', value: '1200' },
  { variable: '--z-tooltip', value: '1300' },
];

export const OPACITY_TOKENS: TokenItem[] = [
  { variable: '--opacity-disabled', value: '0.6' },
  { variable: '--opacity-hover', value: '0.8' },
  { variable: '--opacity-muted', value: '0.5' },
];
