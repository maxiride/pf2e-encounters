import type { Component } from 'svelte';
import type { Token } from './scaffolding/types';
import { registerComponentSchema } from '../core/store/editorStore';

import BadgeEditor, { allTokens as badgeTokens } from './BadgeEditor.svelte';
import SelectBadgeEditor, { allTokens as selectBadgeTokens } from './SelectBadgeEditor.svelte';
import CalloutEditor, { allTokens as calloutTokens } from './CalloutEditor.svelte';
import CornerBadgeEditor, { allTokens as cornerBadgeTokens } from './CornerBadgeEditor.svelte';
import StandardButtonsEditor, { allTokens as buttonTokens } from './StandardButtonsEditor.svelte';
import CardEditor, { allTokens as cardTokens } from './CardEditor.svelte';
import CollapsibleSectionEditor, { allTokens as collapsibleSectionTokens } from './CollapsibleSectionEditor.svelte';
import DialogEditor, { allTokens as dialogTokens } from './DialogEditor.svelte';
import ImageEditor, { allTokens as imageTokens } from './ImageEditor.svelte';
import InlineEditActionsEditor, { allTokens as inlineEditActionsTokens } from './InlineEditActionsEditor.svelte';
import MenuSelectEditor, { allTokens as menuSelectTokens } from './MenuSelectEditor.svelte';
import NotificationEditor, { allTokens as notificationTokens } from './NotificationEditor.svelte';
import ProgressBarEditor, { allTokens as progressBarTokens } from './ProgressBarEditor.svelte';
import RadioButtonEditor, { allTokens as radioButtonTokens } from './RadioButtonEditor.svelte';
import SectionDividerEditor, { allTokens as sectionDividerTokens } from './SectionDividerEditor.svelte';
import SegmentedControlEditor, { allTokens as segmentedControlTokens } from './SegmentedControlEditor.svelte';
import TableEditor, { allTokens as tableTokens } from './TableEditor.svelte';
import TabBarEditor, { allTokens as tabBarTokens } from './TabBarEditor.svelte';
import TooltipEditor, { allTokens as tooltipTokens } from './TooltipEditor.svelte';

export type ComponentId =
  | 'segmentedcontrol'
  | 'button'
  | 'notification'
  | 'dialog'
  | 'radiobutton'
  | 'card'
  | 'badge'
  | 'selectbadge'
  | 'callout'
  | 'cornerbadge'
  | 'image'
  | 'inlineeditactions'
  | 'menuselect'
  | 'sectiondivider'
  | 'collapsiblesection'
  | 'table'
  | 'tabbar'
  | 'tooltip'
  | 'progressbar';

export interface RegistryEntry {
  /** Canonical id — lowercase, matches the runtime component filename + server scan + `setComponentAlias` key. */
  id: ComponentId;
  /** Human-readable label for nav and section headers. */
  label: string;
  /** FontAwesome icon class for the nav rail. */
  icon: string;
  /** Path to the runtime component, relative to repo root. */
  sourceFile: string;
  /** The Svelte editor component to mount in the page. */
  editorComponent: Component<any, any, any>;
  /** Flat token list — the editor's declarative description of its token surface. */
  schema: Token[];
}

/**
 * Single source of truth for every component editor. Each entry binds the
 * canonical id to its label, icon, source file, editor component, and token
 * schema. Display order in the nav rail is sorted alphabetically by label
 * (see `componentRegistryEntries` below) — order in this object literal does
 * not affect the UI.
 *
 * Adding a component:
 *   1. Author `src/components/<Name>.svelte` (declares CSS vars in `:global(:root)`)
 *   2. Author `src/component-editor/<Name>Editor.svelte` (exports `allTokens` from a `<script context="module">` block)
 *   3. Add an entry below.
 */
export const componentRegistry: Readonly<Record<ComponentId, RegistryEntry>> = Object.freeze({
  segmentedcontrol: {
    id: 'segmentedcontrol',
    label: 'Segmented Control',
    icon: 'fas fa-hand-pointer',
    sourceFile: 'src/system/components/SegmentedControl.svelte',
    editorComponent: SegmentedControlEditor,
    schema: segmentedControlTokens,
  },
  button: {
    id: 'button',
    label: 'Button',
    icon: 'fas fa-square',
    sourceFile: 'src/system/components/Button.svelte',
    editorComponent: StandardButtonsEditor,
    schema: buttonTokens,
  },
  notification: {
    id: 'notification',
    label: 'Notification',
    icon: 'fas fa-bell',
    sourceFile: 'src/system/components/Notification.svelte',
    editorComponent: NotificationEditor,
    schema: notificationTokens,
  },
  dialog: {
    id: 'dialog',
    label: 'Dialog',
    icon: 'fas fa-window-restore',
    sourceFile: 'src/system/components/Dialog.svelte',
    editorComponent: DialogEditor,
    schema: dialogTokens,
  },
  radiobutton: {
    id: 'radiobutton',
    label: 'Radio Button',
    icon: 'fas fa-dot-circle',
    sourceFile: 'src/system/components/RadioButton.svelte',
    editorComponent: RadioButtonEditor,
    schema: radioButtonTokens,
  },
  card: {
    id: 'card',
    label: 'Card',
    icon: 'fas fa-id-card',
    sourceFile: 'src/system/components/Card.svelte',
    editorComponent: CardEditor,
    schema: cardTokens,
  },
  badge: {
    id: 'badge',
    label: 'Badge',
    icon: 'fas fa-tag',
    sourceFile: 'src/system/components/Badge.svelte',
    editorComponent: BadgeEditor,
    schema: badgeTokens,
  },
  selectbadge: {
    id: 'selectbadge',
    label: 'Select Badge',
    icon: 'fas fa-circle-dot',
    sourceFile: 'src/system/components/SelectBadge.svelte',
    editorComponent: SelectBadgeEditor,
    schema: selectBadgeTokens,
  },
  callout: {
    id: 'callout',
    label: 'Callout',
    icon: 'fas fa-quote-left',
    sourceFile: 'src/system/components/Callout.svelte',
    editorComponent: CalloutEditor,
    schema: calloutTokens,
  },
  cornerbadge: {
    id: 'cornerbadge',
    label: 'Corner Badge',
    icon: 'fas fa-tags',
    sourceFile: 'src/system/components/CornerBadge.svelte',
    editorComponent: CornerBadgeEditor,
    schema: cornerBadgeTokens,
  },
  image: {
    id: 'image',
    label: 'Image',
    icon: 'fas fa-image',
    sourceFile: 'src/system/components/Image.svelte',
    editorComponent: ImageEditor,
    schema: imageTokens,
  },
  inlineeditactions: {
    id: 'inlineeditactions',
    label: 'Inline Edit Actions',
    icon: 'fas fa-pen',
    sourceFile: 'src/system/components/InlineEditActions.svelte',
    editorComponent: InlineEditActionsEditor,
    schema: inlineEditActionsTokens,
  },
  menuselect: {
    id: 'menuselect',
    label: 'Menu Select',
    icon: 'fas fa-list',
    sourceFile: 'src/system/components/MenuSelect.svelte',
    editorComponent: MenuSelectEditor,
    schema: menuSelectTokens,
  },
  sectiondivider: {
    id: 'sectiondivider',
    label: 'Section Divider',
    icon: 'fas fa-minus',
    sourceFile: 'src/system/components/SectionDivider.svelte',
    editorComponent: SectionDividerEditor,
    schema: sectionDividerTokens,
  },
  collapsiblesection: {
    id: 'collapsiblesection',
    label: 'Collapsible Section',
    icon: 'fas fa-chevron-down',
    sourceFile: 'src/system/components/CollapsibleSection.svelte',
    editorComponent: CollapsibleSectionEditor,
    schema: collapsibleSectionTokens,
  },
  table: {
    id: 'table',
    label: 'Table',
    icon: 'fas fa-table',
    sourceFile: 'src/system/components/Table.svelte',
    editorComponent: TableEditor,
    schema: tableTokens,
  },
  tabbar: {
    id: 'tabbar',
    label: 'Tab Bar',
    icon: 'fas fa-columns',
    sourceFile: 'src/system/components/TabBar.svelte',
    editorComponent: TabBarEditor,
    schema: tabBarTokens,
  },
  tooltip: {
    id: 'tooltip',
    label: 'Tooltip',
    icon: 'fas fa-comment-dots',
    sourceFile: 'src/system/components/Tooltip.svelte',
    editorComponent: TooltipEditor,
    schema: tooltipTokens,
  },
  progressbar: {
    id: 'progressbar',
    label: 'Progress Bar',
    icon: 'fas fa-tasks',
    sourceFile: 'src/system/components/ProgressBar.svelte',
    editorComponent: ProgressBarEditor,
    schema: progressBarTokens,
  },
});

/** Display-ordered list of registry entries — sorted alphabetically by label. Iteration order matches the nav rail. */
export const componentRegistryEntries: ReadonlyArray<RegistryEntry> = Object.freeze(
  Object.values(componentRegistry).sort((a, b) => a.label.localeCompare(b.label)),
);

/** All canonical component ids, in display order. */
export const componentIds: ReadonlyArray<ComponentId> = Object.freeze(
  componentRegistryEntries.map((e) => e.id),
);

// Eager schema registration. Replaces the side-effect-on-import pattern that
// each editor module previously used (top-of-script `registerComponentSchema(...)`).
// Runs once at module load, before any editor instance mounts.
for (const entry of componentRegistryEntries) {
  registerComponentSchema(entry.id, entry.schema);
}

/**
 * Validate that the server's filesystem scan matches the registry's id list.
 * Logs a warning when ids drift. Called at boot from the editor page.
 */
export function validateRegistryAgainstServerScan(serverIds: ReadonlyArray<string>): void {
  const registrySet = new Set<string>(componentIds);
  const serverSet = new Set<string>(serverIds);
  const missingOnServer = componentIds.filter((id) => !serverSet.has(id));
  const extraOnServer = serverIds.filter((id) => !registrySet.has(id));
  if (missingOnServer.length > 0) {
    console.warn(
      '[componentRegistry] registered components missing from server scan:',
      missingOnServer.join(', '),
    );
  }
  if (extraOnServer.length > 0) {
    console.warn(
      '[componentRegistry] components on disk not in registry (will be ignored by editor):',
      extraOnServer.join(', '),
    );
  }
}
