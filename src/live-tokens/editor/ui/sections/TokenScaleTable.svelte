<script lang="ts">
  import { run } from 'svelte/legacy';

  /**
   * Parameterised token-display table.
   *
   * Replaces the seven hand-listed scales (spacing, border-width, radius,
   * font-size, font-weight, line-height, icon-size) in VariablesTab with one
   * component. Each variant renders the same `(token-variable, token-value)`
   * pair plus a kind-specific preview swatch.
   *
   * Values are read live via getComputedStyle (passed in by the parent through
   * `tokens`), so tokens.css remains the single source of truth.
   */
  import { editorState } from '../../core/store/editorStore';

  interface TokenItem {
    variable: string;
    value: string;
  }

  /** Visual layout variant. Each variant matches one of the seven scales the
   *  parent renders; the markup differs only in the preview swatch. */
  type ScaleKind =
    | 'spacing'      // horizontal bar sized by width: var(--xx)
    | 'border'       // horizontal bar sized by height: var(--xx)
    | 'radius'       // square box with border-radius: var(--xx)
    | 'font-size'    // "Ag" text sized by font-size: var(--xx)
    | 'font-weight'  // "Ag" text weighted by font-weight: var(--xx)
    | 'line-height'  // no preview, table-only rows
    | 'icon-size';   // star icon sized by font-size: var(--xx)

  
  
  
  
  interface Props {
    kind: ScaleKind;
    /** Var names to resolve via getComputedStyle. Mutually exclusive with `tokens`. */
    vars?: readonly string[] | undefined;
    /** Pre-built token list. Use when values are static (e.g. duration/z-index/opacity
   *  literals) and don't need live CSS resolution. Mutually exclusive with `vars`. */
    tokens?: TokenItem[] | undefined;
    /** Bumped by the parent when the live CSS values may have changed (breakpoint
   *  flip). Triggers re-resolution when reading via `vars`. */
    liveVersion?: number;
    /** When provided, the parent owns the copy-flash UI (pass copiedVar through). */
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let {
    kind,
    vars = undefined,
    tokens = undefined,
    liveVersion = 0,
    copiedVar = null,
    oncopy
  }: Props = $props();

  function copy(v: string) { oncopy?.(v); }

  function readVar(name: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function formatValueHint(raw: string): string {
    if (!raw) return '';
    if (raw === '9999px') return '9999px (pill)';
    const rem = raw.match(/^(-?[\d.]+)rem$/);
    if (rem) {
      const px = Math.round(parseFloat(rem[1]) * 16 * 100) / 100;
      return `${raw} (${px}px)`;
    }
    return raw;
  }

  // Re-read whenever liveVersion bumps OR the editor mutates any CSS var
  // (editor edits fan out via cssVarSync to :root). Depending on $editorState
  // keeps the display in sync with user edits for free.
  let resolved: TokenItem[] = $state([]);
  run(() => {
    liveVersion;
    $editorState;
    if (tokens) {
      resolved = tokens;
    } else if (vars) {
      resolved = vars.map((variable) => ({ variable, value: formatValueHint(readVar(variable)) }));
    } else {
      resolved = [];
    }
  });
</script>

{#if kind === 'spacing'}
  <div class="spacing-grid">
    {#each resolved as token}
      <div class="spacing-item">
        <div class="spacing-bar" style="width: var({token.variable}); min-width: 2px;"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'border'}
  <div class="spacing-grid">
    {#each resolved as token}
      <div class="spacing-item">
        <div class="border-width-bar" style="height: var({token.variable});"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'radius'}
  <div class="radius-grid">
    {#each resolved as token}
      <div class="radius-item">
        <div class="radius-box" style="border-radius: var({token.variable});"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'font-size'}
  <div class="font-size-demos">
    {#each resolved as token}
      <div class="font-size-item">
        <span class="font-size-preview" style="font-size: var({token.variable});">Ag</span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'font-weight'}
  <div class="font-weight-demos">
    {#each resolved as token}
      <div class="font-weight-item">
        <span class="font-weight-preview" style="font-weight: var({token.variable});">Ag</span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{:else if kind === 'line-height'}
  <div class="token-table">
    {#each resolved as token}
      <div class="token-row">
        <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
        <span class="token-value">{token.value}</span>
      </div>
    {/each}
  </div>
{:else if kind === 'icon-size'}
  <div class="font-size-demos">
    {#each resolved as token}
      <div class="font-size-item">
        <span class="icon-size-preview" style="font-size: var({token.variable});">
          <i class="fas fa-star"></i>
        </span>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.value}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-variable {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  /* Spacing & Borders */
  .spacing-grid {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .spacing-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .spacing-bar {
    height: 1.25rem;
    background: var(--ui-text-accent);
    border-radius: var(--ui-radius-sm);
    flex-shrink: 0;
  }

  .border-width-bar {
    width: 4rem;
    background: var(--ui-text-accent);
    flex-shrink: 0;
  }

  .spacing-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Border Radius */
  .radius-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--ui-space-16);
  }

  .radius-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .radius-box {
    width: 3.5rem;
    height: 3.5rem;
    background: none;
    border: 2px solid var(--ui-border-high);
  }

  /* Font sizes / icon sizes */
  .font-size-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-size-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-size-preview {
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    line-height: 1;
    min-width: 3rem;
  }

  .icon-size-preview {
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 3rem;
    display: inline-flex;
    align-items: center;
  }

  .font-size-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Font weights */
  .font-weight-demos {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .font-weight-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
  }

  .font-weight-preview {
    font-size: var(--ui-font-size-xl);
    font-family: var(--ui-font-sans);
    color: var(--ui-text-primary);
    line-height: 1;
    min-width: 2rem;
  }

  .font-weight-item .token-info {
    flex-direction: row;
    gap: var(--ui-space-8);
    align-items: baseline;
  }

  /* Token Table (line heights, durations, z-indexes, opacity) */
  .token-table {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .token-row {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    padding: var(--ui-space-4) 0;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .token-row:last-child {
    border-bottom: none;
  }
</style>
