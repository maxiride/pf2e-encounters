/**
 * Shared component-API types.
 *
 * These shapes back the public props of multi-action components (Notification,
 * Dialog) so that the prop list stays small as positions are added.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';

/**
 * A clickable action surfaced inside a component's chrome.
 * Position-specific defaults (e.g. footer-right defaulting to 'primary')
 * live in the consuming component's render block, not on this type.
 */
export interface ActionSpec {
  /** Visible text. Optional when an icon-only rendering is desired. */
  label?: string;
  /** Font Awesome icon class (e.g. 'fas fa-check'). */
  icon?: string;
  /** Click handler. The component does not dispatch — caller wires the handler directly. */
  onClick: () => void;
  /** Visual style. Position-default applies when omitted. */
  variant?: ButtonVariant;
  /** Render disabled-but-visible. */
  disabled?: boolean;
}

/**
 * Notification's four action positions. Each is independent; any subset may be present.
 *  - `header`: top-right pill inside the header row
 *  - `inline`: beside the message text on a single row (replaces the description block)
 *  - `left` / `right`: footer body-row buttons
 */
export interface NotificationActions {
  header?: ActionSpec;
  inline?: ActionSpec;
  left?: ActionSpec;
  right?: ActionSpec;
}

/**
 * Dialog footer button spec. Confirm and cancel are symmetric; either may be undefined to hide.
 * `--dialog-confirm-variant` / `--dialog-cancel-variant` config still drives the visual variant
 * when `variant` is unset.
 */
export interface DialogButtonSpec {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick: () => void;
}
