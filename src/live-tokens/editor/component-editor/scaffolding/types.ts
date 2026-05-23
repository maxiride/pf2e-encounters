/** Editor token: a single CSS custom property the user can theme. */
export type Token = {
  label: string;
  variable: string;
  /** When true, this token participates in the linked block when ≥2 variants agree on its value. */
  canBeLinked?: boolean;
  /** Used by the editor store to identify cross-variant counterparts (e.g. all `border-width` tokens link). */
  groupKey?: string;
  /** Token row is rendered in a disabled state (still visible). */
  disabled?: boolean;
  /** Token row is omitted entirely. */
  hidden?: boolean;
  /** When the linked block collapses several same-label same-value rows into one,
      the surviving row carries the other groupKey leads here so writes co-propagate. */
  mergeVariables?: string[];
  /** When false, a padding-shaped token renders only the single-value control
      (no split-to-sides affordance). For tokens consumed via a one-axis CSS
      property like `padding-bottom: var(--x)`, splitting yields side values
      that have nowhere to render — hide the toggle so users can't get into
      that state. Defaults to true for padding-shaped tokens. */
  splittable?: boolean;
  /** Optional element grouping (e.g. 'frame', 'header', 'body'). When a state
      has tokens or type-groups tagged with two or more distinct elements,
      StateBlock partitions the panel into labeled subsections — typography
      and properties for each element render together. */
  element?: string;
  /** Hint to the editor that this token's alias is a structured payload
      (currently only `kind: 'gradient'`). Drives Copy-from's per-kind
      branch — gradient aliases need family-swap of in-family stop colors
      rather than a verbatim ref copy. */
  kind?: 'gradient';
  /** Color-family slug for this token's owning variant (e.g. `brand`,
      `accent`). Set on gradient-kind tokens so Copy-from's family-swap
      can compute the src→dst family substitution. */
  family?: string;
};

/** Editor type-group: a fieldset containing a coordinated set of typography tokens
    (text color + font-family/size/weight/line-height) for a piece of content
    (e.g. a card title, notification body). Optional outline rows let
    text-with-stroke groups (e.g. SectionDivider title) keep their stroke
    width/color visually nested with the typography that drives them. */
export type TypeGroupConfig = {
  legend?: string;
  colorVariable: string;
  colorLabel?: string;
  familyVariable?: string;
  familyLabel?: string;
  sizeVariable?: string;
  sizeLabel?: string;
  weightVariable?: string;
  weightLabel?: string;
  lineHeightVariable?: string;
  lineHeightLabel?: string;
  letterSpacingVariable?: string;
  letterSpacingLabel?: string;
  outlineWidthVariable?: string;
  outlineWidthLabel?: string;
  outlineColorVariable?: string;
  outlineColorLabel?: string;
  /** See `Token.element` — when present, StateBlock groups this fieldset under
      the matching element subsection. */
  element?: string;
};
