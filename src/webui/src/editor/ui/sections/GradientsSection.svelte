<script lang="ts">
  /**
   * Gradient tokens UI lifted from VariablesTab.
   *
   * Reads token list from $editorState.gradients; each stop references a
   * color token, so palette edits flow through. Heavy lifting (stop drag,
   * direction, kind switch) lives in <GradientEditor>; this section is a
   * thin grid that toggles which gradient is being edited.
   */
  import { editorState } from '../../core/store/editorStore';
  import GradientEditor from '../GradientEditor.svelte';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  function copy(v: string) { oncopy?.(v); }

  let editingGradient: string | null = $state(null);
</script>

<section class="section" id="gradients">
  <h2 class="section-title">Gradients</h2>
  <p class="editor-intro">Each stop references a color token, so palette edits flow through. Add or remove stops; switch between linear and radial.</p>
  <div class="gradients-grid">
    {#each $editorState.gradients.tokens as token (token.variable)}
      {@const isEditing = editingGradient === token.variable}
      <div class="gradient-item" class:active={isEditing}>
        {#if !isEditing}
          <div class="gradient-box" style="background: var({token.variable});"></div>
        {/if}
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          {#if !isEditing}
            <button class="gradient-edit-btn" onclick={() => editingGradient = token.variable}>Edit</button>
          {/if}
        </div>
        {#if isEditing}
          <div class="gradient-editor-host">
            <GradientEditor
              variable={token.variable}
              onsave={() => editingGradient = null}
              oncancel={() => editingGradient = null}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .editor-intro {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    margin: 0;
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

  /* Gradients */
  .gradients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
    gap: var(--ui-space-16);
  }

  .gradient-item {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
    background: var(--ui-surface-lowest);
    min-width: 0;
  }

  .gradient-item.active {
    grid-column: 1 / -1;
    border-color: var(--ui-text-primary);
  }

  .gradient-item .token-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .gradient-edit-btn {
    padding: var(--ui-space-2) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    font-family: inherit;
  }

  .gradient-edit-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .gradient-editor-host {
    margin-top: var(--ui-space-8);
    padding-top: var(--ui-space-12);
    border-top: 1px dashed var(--ui-border-low);
  }

  .gradient-box {
    height: 3rem;
    border-radius: var(--ui-radius-md);
  }
</style>
