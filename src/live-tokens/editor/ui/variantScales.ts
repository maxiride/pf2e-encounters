/**
 * Shared scale definitions consumed by `UIVariantSelector`. Each entry pairs
 * a CSS-var prefix with the option list that drives its dropdown. Spread the
 * entry into the selector at the call site:
 *
 *   <UIVariantSelector {variable} {component} {canBeLinked} {...BLUR} on:change />
 *
 * Replaces the per-scale wrappers (UIBlurSelector / UIRadiusSelector / etc.)
 * that were 35–50 lines of identical glue around the same data.
 */

export interface VariantScaleOption {
  key: string;
  label: string;
  /** Resolved value shown in the option's `meta` column. Omit for label-only scales. */
  value?: string;
}

export interface VariantScaleEntry {
  varPrefix: string;
  options: ReadonlyArray<VariantScaleOption>;
}

export const BLUR: VariantScaleEntry = {
  varPrefix: '--blur-',
  options: [
    { key: 'none', label: 'None', value: '0' },
    { key: 'sm', label: 'Small', value: '4px' },
    { key: 'md', label: 'Medium', value: '8px' },
    { key: 'lg', label: 'Large', value: '16px' },
    { key: 'xl', label: 'X-Large', value: '24px' },
    { key: '2xl', label: '2X-Large', value: '32px' },
  ],
};

export const BORDER_WIDTH: VariantScaleEntry = {
  varPrefix: '--border-width-',
  options: [
    { key: '0', label: '0', value: '0' },
    { key: '1', label: '1', value: '1px' },
    { key: '2', label: '2', value: '2px' },
    { key: '3', label: '3', value: '3px' },
    { key: '4', label: '4', value: '4px' },
    { key: '5', label: '5', value: '5px' },
    { key: '6', label: '6', value: '6px' },
    { key: '8', label: '8', value: '8px' },
    { key: '10', label: '10', value: '10px' },
    { key: '12', label: '12', value: '12px' },
    { key: '16', label: '16', value: '16px' },
    { key: '20', label: '20', value: '20px' },
    { key: '24', label: '24', value: '24px' },
  ],
};

export const DOT_SIZE: VariantScaleEntry = {
  varPrefix: '--dot-size-',
  options: [
    { key: '0', label: 'None', value: '0%' },
    { key: '25', label: '25%', value: '25%' },
    { key: '50', label: '50%', value: '50%' },
    { key: '75', label: '75%', value: '75%' },
    { key: '100', label: '100%', value: '100%' },
  ],
};

export const RADIUS: VariantScaleEntry = {
  varPrefix: '--radius-',
  options: [
    { key: 'none', label: 'None', value: '0' },
    { key: 'sm', label: 'Small', value: '0.125rem' },
    { key: 'md', label: 'Medium', value: '0.25rem' },
    { key: 'lg', label: 'Large', value: '0.375rem' },
    { key: 'xl', label: 'X-Large', value: '0.5rem' },
    { key: '2xl', label: '2X-Large', value: '0.625rem' },
    { key: '3xl', label: '3X-Large', value: '0.75rem' },
    { key: '4xl', label: '4X-Large', value: '1.25rem' },
    { key: 'full', label: 'Full', value: '9999px' },
  ],
};

export const SHADOW: VariantScaleEntry = {
  varPrefix: '--shadow-',
  options: [
    { key: 'none', label: 'None' },
    { key: 'sm', label: 'Small' },
    { key: 'md', label: 'Medium' },
    { key: 'lg', label: 'Large' },
    { key: 'xl', label: 'X-Large' },
    { key: '2xl', label: '2X-Large' },
  ],
};

/** Used by `*-divider-height` / `*-track-height` variables; values come from the `--space-*` scale,
 *  not a dedicated `--divider-height-*` scale. The label-set differs from BORDER_WIDTH so a divider
 *  can pick from larger heights (up to 100%). */
export const DIVIDER_HEIGHT: VariantScaleEntry = {
  varPrefix: '--space-',
  options: [
    { key: '0', label: 'None', value: '0px' },
    { key: '8', label: 'XS', value: '0.5rem' },
    { key: '10', label: 'Small', value: '0.625rem' },
    { key: '12', label: 'Medium', value: '0.75rem' },
    { key: '16', label: 'Large', value: '1rem' },
    { key: '20', label: 'XL', value: '1.25rem' },
    { key: '24', label: '2XL', value: '1.5rem' },
    { key: 'full', label: 'Full', value: '100%' },
  ],
};
