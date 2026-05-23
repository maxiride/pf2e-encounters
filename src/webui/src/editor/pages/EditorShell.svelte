<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import VariablesTab from '../ui/VariablesTab.svelte';
  import ThemeFileManager from '../ui/ThemeFileManager.svelte';
  import EditorViewSwitcher from '../ui/EditorViewSwitcher.svelte';
  import ComponentsTab from '../component-editor/scaffolding/ComponentsTab.svelte';
  import ManifestFileManager from '../ui/ManifestFileManager.svelte';
  import { persistTheme, hydrateTheme } from '../core/themes/themeService';
  import { scrollSectionIntoView } from '../ui/scrollSection';
  import { editorState } from '../core/store/editorStore';
  import { editorView, sidebarCondensed, selectedComponent } from '../core/store/editorViewStore';
  import { componentDirty } from '../core/store/editorStore';
  import { componentRegistryEntries, validateRegistryAgainstServerScan } from '../component-editor/registry';
  import { listComponents } from '../core/components/componentConfigService';

  const tokenNavItems = [
    { id: 'palette-editor', label: 'Palette Editor', icon: 'fas fa-palette' },
    { id: 'spacing', label: 'Spacing & Borders', icon: 'fas fa-ruler-combined' },
    { id: 'columns', label: 'Columns', icon: 'fas fa-columns' },
    { id: 'border-radius', label: 'Border Radius', icon: 'fas fa-border-style' },
    { id: 'typography', label: 'Typography', icon: 'fas fa-font' },
    { id: 'icon-sizes', label: 'Icon Sizes', icon: 'fas fa-expand' },
    { id: 'shadows', label: 'Shadows', icon: 'fas fa-cloud' },
    { id: 'overlays', label: 'Overlays', icon: 'fas fa-layer-group' },
    { id: 'gradients', label: 'Gradients', icon: 'fas fa-droplet' },
    { id: 'utility-tokens', label: 'Utility Tokens', icon: 'fas fa-sliders' }
  ];

  const componentNavItems = componentRegistryEntries.map(({ id, label, icon }) => ({ id, label, icon }));

  let selectedTokenSection: string | null = $state(null);
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  // 'auto' = open by default. Auto-condensing on shellWidth caused a bounce
  // as the overlay panel grew past the threshold mid-animation.
  let condensed = $derived($sidebarCondensed === 'auto' ? false : $sidebarCondensed);

  const HINT_DELAY_MS = 80;
  let hintLabel: string | null = $state(null);
  let hintTop = $state(0);
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  function showHint(label: string, target: HTMLElement) {
    if (!condensed) return;
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
    if (!condensed) hideHint();
  });

  function scrollToSection(sectionId: string) {
    selectedTokenSection = sectionId;
    const el = document.getElementById(sectionId);
    if (el) scrollSectionIntoView(el);
  }

  function selectComponent(id: string) {
    selectedComponent.set(id);
    hideHint();
  }

  function toggleCondensed() {
    sidebarCondensed.update((v) => !(v === true));
  }

  async function handleSave(detail: { fileName: string; displayName: string }) {
    const { fileName, displayName } = detail;
    saveStatus = 'saving';
    try {
      await persistTheme(get(editorState), fileName, displayName);
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  async function handleLoad(detail: { fileName: string }) {
    try {
      await hydrateTheme(detail.fileName);
    } catch {
      // silent
    }
  }

  onMount(async () => {
    try {
      const summaries = await listComponents();
      validateRegistryAgainstServerScan(summaries.map((s) => s.name));
    } catch {
      // server unreachable — skip validation
    }
  });
</script>

<div class="layout" class:condensed>
  <nav class="sidebar" class:condensed>
    <div class="rail-toggle-row">
      <button
        type="button"
        class="rail-toggle"
        aria-label={condensed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!condensed}
        onclick={toggleCondensed}
      >
        <i class="fas {condensed ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
      </button>
    </div>

    <EditorViewSwitcher {condensed} />

    {#if $editorView === 'tokens'}
      <div class="nav-items">
        {#each tokenNavItems as item}
          <button
            class="nav-item"
            class:active={selectedTokenSection === item.id}
            onmouseenter={(e) => showHint(item.label, e.currentTarget)}
            onmouseleave={hideHint}
            onclick={() => scrollToSection(item.id)}
          >
            <i class={item.icon}></i>
            <span class="nav-label">{item.label}</span>
          </button>
        {/each}
      </div>
      {#if !condensed}
        <div class="sidebar-footer">
          <ThemeFileManager {saveStatus} onsave={handleSave} onload={handleLoad} />
        </div>
      {/if}
    {:else}
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
            <span class="nav-label">{item.label}</span>
            {#if $componentDirty[item.id]}
              <span class="dirty-dot" aria-label="Unsaved changes" title="Unsaved changes"></span>
            {/if}
          </button>
        {/each}
      </div>
      {#if !condensed}
        <div class="sidebar-footer">
          <ManifestFileManager />
        </div>
      {/if}
    {/if}
  </nav>

  <main class="content">
    {#if $editorView === 'tokens'}
      <VariablesTab />
    {:else}
      <ComponentsTab selectedComponent={$selectedComponent} />
    {/if}
  </main>

  {#if hintLabel !== null && condensed}
    <div class="rail-hint" style="top: {hintTop}px">{hintLabel}</div>
  {/if}
</div>

<style>
  .layout {
    --sidebar-w: 240px;
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    min-height: 100vh;
    width: 100%;
    max-width: 1920px;
    box-sizing: border-box;
    transition: grid-template-columns 220ms ease;
  }

  .layout.condensed {
    --sidebar-w: 48px;
  }

  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: black;
    border-right: 1px solid var(--ui-border-low);
    display: flex;
    z-index: 1;
    flex-direction: column;
    min-width: 0;
  }

  .rail-toggle-row {
    display: flex;
    justify-content: flex-end;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .rail-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 36px;
    background: none;
    border: none;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .rail-toggle:hover {
    background: var(--ui-hover);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4) 0 var(--ui-space-16);
    flex-shrink: 0;
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
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: color 60ms ease, background 60ms ease;
  }

  .nav-item i {
    justify-self: center;
    width: 1.25rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    opacity: 0.85;
  }

  /* Amber dot indicating unsaved changes. Anchored to the top-right of the
     icon column so it stays visible whether the sidebar is condensed
     (icon-only) or expanded (icon + label). */
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

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
    opacity: 1;
    transition: opacity 180ms ease;
  }

  .layout.condensed .nav-label {
    opacity: 0;
  }

  .nav-item:hover {
    color: var(--ui-text-secondary);
    background: var(--ui-hover);
  }

  .nav-item.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
  }

  .content {
    padding: var(--ui-space-24) var(--ui-space-32);
    overflow-y: auto;
    background: black;
    min-width: 0;
    isolation: isolate;
  }

  @media (max-width: 1280px) {
    .content {
      padding: var(--ui-space-20) var(--ui-space-20);
    }
  }

  @media (max-width: 1024px) {
    .content {
      padding: var(--ui-space-16) var(--ui-space-12);
    }
  }

  .sidebar-footer {
    flex-shrink: 0;
    margin-top: auto;
    padding: var(--ui-space-12) var(--ui-space-8) var(--ui-space-16);
    border-top: 1px solid var(--ui-border-low);
  }

  .rail-hint {
    position: fixed;
    left: calc(var(--sidebar-w) + var(--ui-space-6));
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
