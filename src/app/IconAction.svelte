<script lang="ts">
  type Tone = 'green' | 'gray';

  interface Props {
    icon: string;
    tone?: Tone;
    onclick?: (e: MouseEvent) => void;
    title?: string;
    /** Render as a non-interactive `<span>` (e.g. an inline marker in help text). */
    decorative?: boolean;
  }

  let { icon, tone = 'gray', onclick, title, decorative = false }: Props = $props();
</script>

{#if decorative}
  <span class="icon-action {tone} decorative" aria-hidden="true">{icon}</span>
{:else}
  <button class="icon-action {tone}" {title} aria-label={title} onclick={(e) => onclick?.(e)}>{icon}</button>
{/if}

<style>
  .icon-action {
    /* Fill the containing cell so hover background paints the whole cell.
       Parent (td.action-cell) is position: relative. */
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background: transparent;
    border: 0;
    padding: var(--space-8, 8px);
    font-size: var(--font-size-md);
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition: background var(--duration-150, 150ms), color var(--duration-150, 150ms);
  }
  .icon-action.decorative {
    /* Inline use inside body copy — don't stretch. */
    position: static;
    display: inline-flex;
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
  }

  .icon-action.green { color: var(--text-success-secondary, #2f974e); }
  .icon-action.green:hover {
    background: var(--surface-success-high, #007733);
    color: var(--text-success, #88f2a0);
  }

  .icon-action.gray { color: var(--text-tertiary, #999); }
  .icon-action.gray:hover {
    background: var(--surface-neutral-high, #5c6369);
    color: var(--text-primary, #fff);
  }

  .icon-action.decorative {
    cursor: default;
    pointer-events: none;
  }
</style>
