// Generic primitives
export { default as UIDialog } from './UIDialog.svelte';
export { default as UILinkToggle } from './UILinkToggle.svelte';
export { default as UITokenSelector } from './UITokenSelector.svelte';
export { default as UIVariantSelector } from './UIVariantSelector.svelte';
export { default as UIOptionList } from './UIOptionList.svelte';
export { default as UIOptionItem } from './UIOptionItem.svelte';

// Semantic-property selectors
export { default as UIPaletteSelector } from './UIPaletteSelector.svelte';
export { default as UIFontFamilySelector } from './UIFontFamilySelector.svelte';
export { default as UIFontWeightSelector } from './UIFontWeightSelector.svelte';
// Scale data spread into UIVariantSelector — replaces the per-scale wrappers.
export * from './variantScales';

// Editor tabs & panels
export { default as VariablesTab } from './VariablesTab.svelte';
export { default as TextTab } from './TextTab.svelte';
export { default as SurfacesTab } from './SurfacesTab.svelte';

// Palette editor stack
export { default as PaletteEditor } from './PaletteEditor.svelte';
export { default as ColorEditPanel } from './ColorEditPanel.svelte';
export { default as BezierCurveEditor } from './BezierCurveEditor.svelte';

// Font editors
export { default as FontStackEditor } from './FontStackEditor.svelte';
export { default as ProjectFontsSection } from './ProjectFontsSection.svelte';

// Theme persistence UI
export { default as ThemeFileManager } from './ThemeFileManager.svelte';
