<script lang="ts">
  import { onMount } from 'svelte';
  import EditorShell from './EditorShell.svelte';
  import UICopyPopover from '../ui/UICopyPopover.svelte';
  import { installEditorKeybindings } from '../core/store/editorKeybindings';
  import { initializeEditorStore } from '../core/store/editorStore';
  import { storageKey } from '../core/store/editorConfig';
  // Editor chrome + form controls + icon font must be JS imports (not @import
  // inside the style block) so Vite resolves them via the module graph
  // regardless of how the consumer compiles Svelte CSS (external ?lang.css vs
  // injected); otherwise the @import URLs leak to the browser and 404 against
  // the consumer's root.
  import '../styles/ui-editor.css';
  import '../styles/ui-form-controls.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';

  const inOverlay = typeof window !== 'undefined' && window.parent !== window;

  // Where "Back to site" sends the user. Prefer the previous non-editor entry
  // from session history; fall back to /demo and finally /.
  const backHref = pickBackHref();

  function pickBackHref(): string {
    try {
      const prev = sessionStorage.getItem(storageKey('prev-route'));
      if (prev && prev !== '/editor') return prev;
    } catch {
      // ignore
    }
    return '/demo';
  }

  onMount(() => {
    initializeEditorStore();
    return installEditorKeybindings();
  });
</script>

<div class="editor-page">
  {#if !inOverlay}
    <div class="editor-bar">
      <div class="bar-left">
        <a href={backHref} class="back-link">
          <i class="fas fa-arrow-left"></i>
          <span>Back to site</span>
        </a>
        <span class="editor-label">Editor</span>
      </div>
    </div>
  {/if}

  <EditorShell />
  <UICopyPopover />
</div>

<style>
  .editor-page {
    min-height: 100vh;
    background: black;
  }

  .editor-bar {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    padding: var(--ui-space-10) var(--ui-space-16);
    background: black;
    border-bottom: 1px solid var(--ui-border-low);
    min-height: 52px;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    min-width: 0;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    color: var(--ui-text-tertiary);
    text-decoration: none;
    font-size: var(--ui-font-size-md);
    transition: color var(--ui-transition-fast);
  }

  .back-link:hover {
    color: var(--ui-text-primary);
  }

  .editor-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  @media (max-width: 1100px) {
    .editor-label {
      display: none;
    }
  }
</style>
