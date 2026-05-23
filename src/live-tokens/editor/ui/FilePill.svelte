<script lang="ts">
  interface Props {
    /** Display label shown in the pill. */
    name: string;
    /** Render a lock glyph and italicize the label for the protected default. */
    isProtected?: boolean;
    /** Highlight border + inner glow for unsaved/dirty state. */
    dirty?: boolean;
    /** Green border for editor-matches-production / live state. */
    applied?: boolean;
    /** Tooltip text for the lock glyph. */
    protectedTitle?: string;
    /** Tooltip for the whole pill (typically the full display name). */
    title?: string;
    /** Inline style passthrough — for fixed-width layouts driven by the parent row. */
    style?: string;
  }
  let {
    name,
    isProtected = false,
    dirty = false,
    applied = false,
    protectedTitle = '',
    title = '',
    style = '',
  }: Props = $props();
</script>

<span class="file-pill" class:dirty class:applied class:protected={isProtected} {title} {style}>
  {#if isProtected}
    <i class="fas fa-lock pill-glyph" aria-hidden="true" title={protectedTitle}></i>
  {/if}
  <span class="pill-name">{name}</span>
</span>

<style>
  .file-pill {
    --filepill-applied: #5aa85e;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
  }

  .file-pill.dirty {
    border-color: color-mix(in srgb, var(--ui-highlight) 60%, var(--ui-border-low));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ui-highlight) 35%, transparent);
  }

  .file-pill.applied {
    border-color: color-mix(in srgb, var(--filepill-applied) 50%, var(--ui-border-low));
  }

  .pill-name {
    flex: 1;
    min-width: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-pill.protected .pill-name {
    font-style: italic;
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-secondary);
  }

  .pill-glyph {
    flex: 0 0 auto;
    font-size: 0.75em;
    color: var(--ui-text-muted);
  }
</style>
