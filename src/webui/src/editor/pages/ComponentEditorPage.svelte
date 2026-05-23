<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';
  import ManifestFileManager from '../ui/ManifestFileManager.svelte';
  import { navigate } from '../core/routing/router';
  import { componentRegistryEntries, validateRegistryAgainstServerScan } from '../component-editor/registry';
  import { listComponents } from '../core/components/componentConfigService';
  import { selectedComponent } from '../core/store/editorViewStore';
  import { componentDirty } from '../core/store/editorStore';
  // Editor chrome + form controls + icon font must be JS imports (not @import
  // inside the style block) so Vite resolves them via the module graph
  // regardless of how the consumer compiles Svelte CSS (external ?lang.css vs
  // injected); otherwise the @import URLs leak to the browser and 404 against
  // the consumer's root.
  import '../styles/ui-editor.css';
  import '../styles/ui-form-controls.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';

  let drawerOpen = $state(true);

  // Demo page is statically imported from `./Demo.svelte` in App.svelte; the
  // glob resolves to an empty object if the file has been deleted, in which
  // case we hide the demo option from the page-switcher.
  const demoExists = Object.keys(import.meta.glob('./Demo.svelte')).length > 0;

  let pageMenuOpen = $state(false);
  let pageMenuRoot: HTMLElement | undefined = $state();

  const HINT_DELAY_MS = 80;
  let hintLabel: string | null = $state(null);
  let hintTop = $state(0);
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  function showHint(label: string, target: HTMLElement) {
    if (drawerOpen) return;
    if (hintTimer) clearTimeout(hintTimer);
    const top = target.getBoundingClientRect().top + target.offsetHeight / 2;
    hintTimer = setTimeout(() => {
      hintLabel = label;
      hintTop = top;
    }, HINT_DELAY_MS);
  }

  function hideHint() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    hintLabel = null;
  }

  run(() => {
    if (drawerOpen) hideHint();
  });

  function selectComponent(id: string) {
    selectedComponent.set(id);
    hideHint();
  }

  function selectPage(path: string) {
    pageMenuOpen = false;
    navigate(path);
  }

  function handleDocClick(e: MouseEvent) {
    if (!pageMenuOpen) return;
    if (pageMenuRoot && !pageMenuRoot.contains(e.target as Node)) {
      pageMenuOpen = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (pageMenuOpen) pageMenuOpen = false;
      else if (drawerOpen) drawerOpen = false;
    }
  }

  onMount(async () => {
    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('keydown', handleKeydown);
    try {
      const summaries = await listComponents();
      validateRegistryAgainstServerScan(summaries.map((s) => s.name));
    } catch {
      // Server unreachable — registry's eager schema registration still works
      // for the editor; validation just gets skipped this boot.
    }
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
    window.removeEventListener('keydown', handleKeydown);
  });

  const componentNavItems = componentRegistryEntries.map(({ id, label, icon }) => ({ id, label, icon }));
</script>

<!--
  Site-level component editor page. Wrapped in .editor-page so the
  ComponentsTab scaffolding (labels, section wrappers) can resolve its
  --ui-* custom properties from styles/ui-editor.css. The actual components inside
  still read the user's design tokens, so live edits in the overlay
  editor flow straight through to this page.
-->
<div class="editor-page components-shell" class:rail-expanded={drawerOpen}>
  <nav class="sidebar rail" class:expanded={drawerOpen}>
    <div class="rail-header" bind:this={pageMenuRoot}>
      <button
        type="button"
        class="rail-toggle"
        aria-label={drawerOpen ? 'Collapse components menu' : 'Expand components menu'}
        aria-expanded={drawerOpen}
        onclick={() => (drawerOpen = !drawerOpen)}
      >
        <i class="fas {drawerOpen ? 'fa-arrow-left' : 'fa-arrow-right'}"></i>
      </button>
      <button
        type="button"
        class="page-menu-trigger"
        class:open={pageMenuOpen}
        aria-haspopup="menu"
        aria-expanded={pageMenuOpen}
        tabindex={drawerOpen ? 0 : -1}
        onclick={() => drawerOpen && (pageMenuOpen = !pageMenuOpen)}
      >
        <span class="rail-label">Components</span>
        <i class="fas fa-chevron-down rail-chevron" class:open={pageMenuOpen}></i>
      </button>
      {#if pageMenuOpen && drawerOpen}
        <div class="page-menu" role="menu">
          <button class="page-menu-item" role="menuitem" onclick={() => selectPage('/')}>
            <i class="fas fa-home"></i>
            <span>Main site</span>
          </button>
          {#if demoExists}
            <button class="page-menu-item" role="menuitem" onclick={() => selectPage('/demo')}>
              <i class="fas fa-box-open"></i>
              <span>Demo page</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
    <div class="nav-items">
      {#each componentNavItems as item}
        <button
          class="nav-item"
          class:active={$selectedComponent === item.id}
          class:dirty={$componentDirty[item.id]}
          onmouseenter={(e) => showHint(item.label, e.currentTarget)}
          onmouseleave={hideHint}
          onclick={() => selectComponent(item.id)}
        >
          <i class={item.icon}></i>
          <span class="rail-label">{item.label}</span>
          {#if $componentDirty[item.id]}
            <span class="dirty-dot" aria-label="Unsaved changes" title="Unsaved changes"></span>
          {/if}
        </button>
      {/each}
    </div>
    {#if drawerOpen}
      <div class="sidebar-footer">
        <ManifestFileManager />
      </div>
    {/if}
  </nav>

  <main class="content">
    <ComponentsTab selectedComponent={$selectedComponent} />
  </main>

  {#if hintLabel !== null && !drawerOpen}
    <div class="rail-hint" style="top: {hintTop}px">{hintLabel}</div>
  {/if}
</div>

<style>
  .components-shell {
    --rail-w: 48px;
    display: grid;
    grid-template-columns: var(--rail-w) minmax(0, 1fr);
    height: 100vh;
    width: 100%;
    background: black;
    overflow: hidden;
    transition: grid-template-columns 220ms ease;
  }

  .components-shell.rail-expanded {
    --rail-w: 240px;
  }

  .sidebar.rail {
    position: relative;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-low);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rail-header {
    position: relative;
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    padding: var(--ui-space-12) 0 var(--ui-space-12) 0;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .rail-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .rail-toggle:hover {
    background: var(--ui-hover);
  }

  .page-menu-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    height: 36px;
    padding: 0 var(--ui-space-10) 0 0;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    text-align: left;
    cursor: pointer;
    transition: opacity 180ms ease;
    opacity: 0;
    pointer-events: none;
  }

  .components-shell.rail-expanded .page-menu-trigger {
    opacity: 1;
    pointer-events: auto;
  }

  .rail-chevron {
    font-size: 0.7em;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
  }

  .rail-chevron.open {
    transform: rotate(180deg);
  }

  .rail-label {
    white-space: nowrap;
    overflow: hidden;
    opacity: 0;
    transition: opacity 180ms ease;
  }

  .components-shell.rail-expanded .rail-label {
    opacity: 1;
  }

  .page-menu {
    position: absolute;
    top: calc(100% - var(--ui-space-2));
    left: 48px;
    right: var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 10;
  }

  .page-menu-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    text-align: left;
    cursor: pointer;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .page-menu-item i {
    width: 1rem;
    text-align: center;
    opacity: 0.7;
  }

  .page-menu-item:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: 0 0 var(--ui-space-16);
    background: black;
  }

  .sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding: var(--ui-space-12) var(--ui-space-8) var(--ui-space-16);
    border-top: 1px solid var(--ui-border-low);
  }

  .nav-item {
    position: relative;
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    width: 100%;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 0;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: color 60ms ease, background 60ms ease;
  }

  .nav-item:hover {
    color: var(--ui-text-secondary);
    background: var(--ui-hover);
  }

  .nav-item.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
  }

  .nav-item i {
    justify-self: center;
    width: 1.25rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    opacity: 0.85;
  }

  /* Amber dot indicating unsaved changes. Anchored to the top-right of the
     icon column so it stays visible whether the rail is collapsed (icon-only)
     or expanded (icon + label). */
  .dirty-dot {
    position: absolute;
    top: 8px;
    left: 30px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ui-highlight);
    box-shadow: 0 0 0 2px black;
    pointer-events: none;
  }

  .nav-item.dirty {
    color: var(--ui-text-secondary);
  }

  .content {
    padding: 1rem var(--ui-space-32) 0;
    background: black;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .rail-hint {
    position: fixed;
    left: calc(var(--rail-w) + var(--ui-space-6));
    transform: translateY(-50%);
    z-index: 50;
    padding: var(--ui-space-4) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
</style>
