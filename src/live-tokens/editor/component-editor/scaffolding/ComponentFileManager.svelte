<script module lang="ts">
  declare const __PROJECT_ROOT__: string | undefined;
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import UIInfoPopover from '../../ui/UIInfoPopover.svelte';
  import { get } from 'svelte/store';
  import type { AliasDiskValue, ComponentConfig, ComponentConfigMeta } from '../../core/themes/themeTypes';
  import { componentSourceFile } from './componentSources';
  import {
    loadComponentConfig,
    saveComponentConfig,
    deleteComponentConfig,
    setActiveComponentFile,
    setComponentProductionFile,
    type ComponentProductionInfo,
  } from '../../core/components/componentConfigService';
  import {
    editorState,
    componentDirty,
    loadComponentActive,
    markComponentSaved,
  } from '../../core/store/editorStore';
  import { bumpProductionRevision } from '../../core/productionPulse';
  import { listManifests, saveAsManifest } from '../../core/manifests/manifestService';
  import type { ManifestMeta } from '../../core/themes/themeTypes';
  import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../core/themes/migrations';
  import type { CssVarRef } from '../../core/store/editorTypes';
  import { safeFetch } from '../../core/storage/storage';
  import { flashStatus } from '../../core/flashStatus';
  import ComponentFileMenu from './ComponentFileMenu.svelte';
  import SaveAsDialog from './SaveAsDialog.svelte';
  import FilePill from '../../ui/FilePill.svelte';
  import UIPillButton from '../../ui/UIPillButton.svelte';
  import UISquareButton from '../../ui/UISquareButton.svelte';

  
  
  
  interface Props {
    /** Which component this manager controls (e.g. "button"). */
    component: string;
    /** Display name shown at the start of the bar (e.g. "Segmented Control"). */
    title?: string;
    /** When provided, renders a Reset button that reverts the component to its
      currently-loaded config file (discarding unsaved edits). To switch
      configs or return to default, use the File menu. */
    resetVariables?: string[] | null;
  }

  let { component, title = '', resetVariables = null }: Props = $props();

  const projectRoot: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
  let sourceFile = $derived(componentSourceFile(component));

  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  let saveStatus: SaveStatus = 'idle';
  const setSaveStatus = (s: SaveStatus) => (saveStatus = s);

  let files: ComponentConfigMeta[] = $state([]);
  let activeFileName = $state('default');
  let currentDisplayName = $state('Default');
  let saveAsDialog = $state(false);
  // Title + description re-set per trigger so the auto-prompts (Save on
  // default, Adopt on default+dirty) explain why they appeared, while the
  // manual Save As button stays terse.
  let saveAsTitle = $state('Save Component As');
  let saveAsDescription = $state('');

  let productionInfo = $state<ComponentProductionInfo | null>(null);
  type ProductionStatus = 'idle' | 'updating' | 'done' | 'error';
  let productionUpdateStatus: ProductionStatus = $state('idle');
  let adoptFeedback = $state('');

  // Manifest SaveAs prompt for the "Adopt while default manifest is active" case.
  let manifestSaveAsDialog = $state(false);
  let manifests: ManifestMeta[] = $state([]);
  let retryAdoptAfterManifestSave = false;

  const setProductionStatus = (s: ProductionStatus) => (productionUpdateStatus = s);

  let compDirty = $derived($componentDirty[component] ?? false);
  let isApplied = $derived(!!productionInfo && productionInfo.fileName === activeFileName && !compDirty);
  let resetDirty = $derived(!!resetVariables && compDirty);

  async function refreshFiles() {
    // safeFetch returns null on dev-server unavailable / non-2xx — silently
    // leave the file list empty in that case.
    const data = await safeFetch<{
      files: ComponentConfigMeta[];
      activeFile: string;
    }>(`/api/component-configs/${encodeURIComponent(component)}`);
    if (!data) return;
    files = data.files;
    activeFileName = data.activeFile;
    const active = files.find((f) => f.fileName === activeFileName);
    if (active) currentDisplayName = active.name;
  }

  async function refreshProduction() {
    // Preserve existing productionInfo on transient fetch failure rather than
    // clobbering it to null — same behaviour as the previous empty catch.
    const info = await safeFetch<ComponentProductionInfo>(
      `/api/component-configs/${encodeURIComponent(component)}/production`,
    );
    if (info) productionInfo = info;
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }

  function refToDiskValue(ref: CssVarRef): AliasDiskValue {
    if (ref.kind === 'token') return ref.name;
    if (ref.kind === 'literal') return ref.value;
    return { kind: 'gradient', value: ref.value };
  }

  function currentAliases(): Record<string, AliasDiskValue> {
    const slice = get(editorState).components[component];
    if (!slice) return {};
    const out: Record<string, AliasDiskValue> = {};
    for (const [k, ref] of Object.entries(slice.aliases)) out[k] = refToDiskValue(ref);
    return out;
  }

  function currentConfig(): Record<string, unknown> {
    return get(editorState).components[component]?.config ?? {};
  }

  async function persist(fileName: string, displayName: string): Promise<void> {
    const now = new Date().toISOString();
    const data: ComponentConfig = {
      name: displayName,
      component,
      createdAt: now,
      updatedAt: now,
      aliases: { ...currentAliases() },
      config: { ...currentConfig() },
      schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    };
    await saveComponentConfig(component, fileName, data);
    await setActiveComponentFile(component, fileName);
    activeFileName = fileName;
    currentDisplayName = displayName;
    markComponentSaved(component);
  }

  async function handleSave() {
    if (activeFileName === 'default') {
      // Default is regenerated from source, so the first Save quietly opens
      // Save As — same dialog as the Save As button, no scolding description.
      openSaveAs();
      return;
    }
    saveStatus = 'saving';
    try {
      await persist(activeFileName, currentDisplayName);
      flashStatus(setSaveStatus, 'saved');
      await refreshFiles();
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  function openSaveAs() {
    saveAsTitle = 'Save Component As';
    saveAsDescription = '';
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    saveStatus = 'saving';
    try {
      await persist(fileName, displayName);
      flashStatus(setSaveStatus, 'saved');
      await refreshFiles();
    } catch {
      flashStatus(setSaveStatus, 'error');
    }
  }

  async function handleLoad(file: ComponentConfigMeta) {
    // Multi-step service flow (load + set-active) — if any network call
    // fails, the dialog is already closed and the local state stays on the
    // previous selection. Silent by design; the same boot resilience that
    // keeps the editor working without a dev-server applies here.
    try {
      const cfg = await loadComponentConfig(component, file.fileName);
      await setActiveComponentFile(component, file.fileName);
      loadComponentActive(component, file.fileName, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
      activeFileName = file.fileName;
      currentDisplayName = file.name;
    } catch {
      // intentional: see comment above
    }
  }

  async function handleDelete(file: ComponentConfigMeta) {
    if (file.fileName === 'default') return;
    // Multi-step service flow (delete + reload-default-on-active-removal).
    // Silent by design — see handleLoad.
    try {
      // Capture before refreshFiles() reads the server's reverted active back
      // into local state — otherwise the "was this the active file?" check
      // below sees the post-revert value and skips the reload.
      const wasActive = file.fileName === activeFileName;
      await deleteComponentConfig(component, file.fileName);
      await refreshFiles();
      await refreshProduction();
      if (wasActive) {
        // Server reverts active to default; reload default aliases into the store
        // so the deleted file's CSS vars are replaced by default's.
        const defaultCfg = await loadComponentConfig(component, 'default');
        loadComponentActive(component, 'default', defaultCfg.aliases, defaultCfg.config, defaultCfg.schemaVersion ?? 0);
        activeFileName = 'default';
        currentDisplayName = 'Default';
      }
    } catch {
      // intentional: see comment above
    }
  }

  async function handleUpdateProduction() {
    // If the editor has unsaved edits, persist them first so production adopts
    // the actual current state — not a stale snapshot. The `default` file is
    // regenerated from source and can't be overwritten, so route to Save As
    // and bail; the user can re-trigger Adopt after the new file is saved.
    if (compDirty && activeFileName === 'default') {
      saveAsTitle = 'Save Component As';
      saveAsDescription =
        'Adopting pushes this component to production. The default config is read-only, so save your edits to a new file first.';
      saveAsDialog = true;
      return;
    }
    const wasDirty = compDirty;
    const adoptingName = currentDisplayName;
    productionUpdateStatus = 'updating';
    try {
      if (wasDirty) {
        await persist(activeFileName, currentDisplayName);
        await refreshFiles();
      }
      await setComponentProductionFile(component, activeFileName);
      await refreshProduction();
      bumpProductionRevision();
      adoptFeedback = wasDirty
        ? `Saved "${adoptingName}" and adopted`
        : `Adopted "${adoptingName}"`;
      flashStatus(setProductionStatus, 'done', { onIdle: () => (adoptFeedback = '') });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'ACTIVE_IS_PROTECTED') {
        adoptFeedback = '';
        productionUpdateStatus = 'idle';
        retryAdoptAfterManifestSave = true;
        try {
          manifests = await listManifests();
        } catch {
          manifests = [];
        }
        manifestSaveAsDialog = true;
        return;
      }
      adoptFeedback = '';
      flashStatus(setProductionStatus, 'error', { onIdle: () => (adoptFeedback = '') });
    }
  }

  async function onManifestSaveAs(detail: { displayName: string; fileName: string }) {
    manifestSaveAsDialog = false;
    try {
      await saveAsManifest(detail.fileName, detail.displayName);
    } catch (err) {
      window.alert(`Failed to create manifest: ${(err as Error).message}`);
      retryAdoptAfterManifestSave = false;
      return;
    }
    if (retryAdoptAfterManifestSave) {
      retryAdoptAfterManifestSave = false;
      await handleUpdateProduction();
    }
  }

  async function handleReset() {
    if (!resetVariables) return;
    try {
      const cfg = await loadComponentConfig(component, activeFileName);
      loadComponentActive(component, activeFileName, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
    } catch {
      // intentional: dev-server unavailable — leave state untouched
    }
  }
</script>

<header class="cfm-bar">
  <div class="cfm-title-row">
    {#if title}
      <h2 class="cfm-title">{title}</h2>
    {/if}
    {#if sourceFile && projectRoot}
      <UIPillButton
        icon="fa-code"
        href="vscode://file/{projectRoot}/{sourceFile}"
        title="Open {sourceFile} in VS Code"
      >Show component source</UIPillButton>
    {/if}
  </div>

  <div class="cfm-rows" class:in-sync={isApplied} class:promotable={compDirty || (!!productionInfo && productionInfo.fileName !== activeFileName)}>
    <div class="cfm-row cfm-row-editor" class:dirty={compDirty} class:applied={isApplied}>
      <span class="cfm-rail" aria-hidden="true"></span>
      <div class="cfm-row-head">
        <span class="cfm-row-label">Editor</span>
        <span class="cfm-row-status" class:dirty={compDirty} class:applied={isApplied}>
          <i class="cfm-status-dot" aria-hidden="true"></i>
          <span>{compDirty ? 'unsaved' : isApplied ? 'live' : 'saved'}</span>
        </span>
      </div>
      <FilePill
        name={currentDisplayName}
        isProtected={activeFileName === 'default'}
        dirty={compDirty}
        applied={isApplied}
        protectedTitle="Protected system config"
        title={compDirty
          ? 'Unsaved changes'
          : isApplied
            ? 'Active config is applied to production'
            : ''}
        style="flex: 0 1 11.25rem; min-width: 0; max-width: 11.25rem;"
      />
      <div class="cfm-actions">
        <ComponentFileMenu
          {component}
          {files}
          {activeFileName}
          onsave={handleSave}
          onsaveAs={openSaveAs}
          onopenLoad={refreshFiles}
          onload={handleLoad}
          ondelete={handleDelete}
        />
        {#if resetVariables}
          <UISquareButton
            icon="fa-rotate-left"
            onclick={handleReset}
            disabled={!resetDirty}
            title="Revert unsaved changes to {currentDisplayName}"
          >Reset</UISquareButton>
        {/if}
      </div>
    </div>

    <div class="cfm-promote" aria-hidden="true">
      <i class="fas fa-arrow-down cfm-promote-icon"></i>
    </div>

    <div class="cfm-row cfm-row-production" class:applied={isApplied}>
      <span class="cfm-rail" aria-hidden="true"></span>
      <div class="cfm-row-head">
        <span class="cfm-row-label">Prod</span>
        <span class="cfm-row-status applied">
          <i class="cfm-status-dot" aria-hidden="true"></i>
          <span>live</span>
        </span>
      </div>
      <FilePill
        name={productionInfo?.name ?? '—'}
        isProtected={productionInfo?.fileName === 'default'}
        protectedTitle="Protected system config"
        style="flex: 0 1 11.25rem; min-width: 0; max-width: 11.25rem;"
      />
      <div class="cfm-actions">
        <UISquareButton
          variant="success"
          icon={productionUpdateStatus === 'updating'
            ? 'fa-spinner'
            : productionUpdateStatus === 'done'
              ? 'fa-check'
              : productionUpdateStatus === 'error'
                ? 'fa-xmark'
                : 'fa-arrow-down'}
          onclick={handleUpdateProduction}
          disabled={productionUpdateStatus === 'updating' || !productionInfo || (productionInfo.fileName === activeFileName && !compDirty)}
          title={!productionInfo
            ? ''
            : productionInfo.fileName === activeFileName && !compDirty
              ? 'Already in sync with editor'
              : compDirty && activeFileName === 'default'
                ? 'Save edits as a new file, then adopt'
                : compDirty
                  ? `Save "${currentDisplayName}" and adopt`
                  : `Adopt "${currentDisplayName}" from editor`}
        >
          {#if productionUpdateStatus === 'idle'}Adopt{:else if productionUpdateStatus === 'updating'}Adopting{:else if productionUpdateStatus === 'done'}Adopted{:else}Error{/if}
        </UISquareButton>
        <UIInfoPopover title="Component Configuration" ariaLabel="About Save and Adopt">
          <p>
            Editor and Prod both use a saved file. When they share the
            <em>same</em> file, <strong>Saved changes</strong> go to into production
            immediately. They are sharing the configuration.
          </p>
          <p>
            To experiment without changing production,<strong>Save As</strong> a new file first.
          </p>
          <p>
            When ready, click <strong>Adopt</strong> to use the new file on prod.
          </p>
        </UIInfoPopover>
        {#if adoptFeedback}
          <span class="cfm-feedback" aria-live="polite">{adoptFeedback}</span>
        {/if}
      </div>
    </div>
  </div>
</header>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  currentFileName={activeFileName}
  reservedDisplayNames={files.filter((f) => f.fileName === 'default').map((f) => f.name)}
  title={saveAsTitle}
  description={saveAsDescription}
  placeholder="Component config name…"
  branchFromDefaultName={`my-${(title || 'component').toLowerCase().trim().replace(/\s+/g, '-')}`}
  onsave={confirmSaveAs}
/>

<SaveAsDialog
  bind:show={manifestSaveAsDialog}
  currentDisplayName="my-manifest"
  files={manifests}
  reservedDisplayNames={manifests.filter((m) => m.fileName === 'default').map((m) => m.name)}
  title="Save Manifest As"
  placeholder="Manifest name…"
  description="Adopting a component change updates the active manifest, The default manifest is locked. Name a new manifest for the site."
  reservedNameMessage='That name is reserved for the protected default manifest.'
  onsave={onManifestSaveAs}
/>

<style>
  .cfm-bar {
    --cfm-applied: #5aa85e;
    --cfm-rail-neutral: var(--ui-border);
    --cfm-rail-dirty: var(--ui-highlight);
    --cfm-rail-applied: var(--cfm-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .cfm-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-16);
    flex-wrap: wrap;
    max-width: 34rem;
    margin-bottom: var(--ui-space-16);
  }

  .cfm-title {
    margin: 0;
    min-width: 0;
    font-size: var(--ui-font-size-3xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    line-height: 1.1;
  }

  /* ── two-row pipeline ─────────────────────────────────────── */
  .cfm-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    max-width: 34rem;
  }

  .cfm-row {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ui-space-10);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-8) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .cfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--cfm-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .cfm-row-editor.dirty .cfm-rail { background: var(--cfm-rail-dirty); }
  .cfm-row-editor.applied .cfm-rail { background: var(--cfm-rail-applied); }
  .cfm-row-production.applied .cfm-rail { background: var(--cfm-rail-applied); }

  /* row head — label stacked over a small status sub-label so the
     filename pill in each row starts at the same x and width */
  .cfm-row-head {
    flex-shrink: 0;
    width: 4.5rem;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .cfm-row-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    text-transform: uppercase;
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .cfm-row-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.75rem;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .cfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .cfm-row-status.dirty {
    color: var(--ui-highlight);
  }
  .cfm-row-status.dirty .cfm-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: cfm-pulse 1.6s ease-in-out infinite;
  }

  .cfm-row-status.applied {
    color: var(--cfm-applied);
  }
  .cfm-row-status.applied .cfm-status-dot {
    opacity: 1;
  }

  /* actions cluster — sits directly next to the filename pill so the
     buttons stay near the input and don't drift under the open editor panel.
     position: relative anchors the info popover below the cluster. */
  .cfm-actions {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    flex-wrap: wrap;
  }

  .cfm-feedback {
    font-size: var(--ui-font-size-xs);
    color: var(--cfm-applied);
    white-space: nowrap;
    animation: cfm-feedback-in 180ms ease;
  }

  @keyframes cfm-feedback-in {
    from { opacity: 0; transform: translateX(-2px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* promote connector between rows */
  .cfm-promote {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    /* aligns under the pill column: row left-padding + head width + row gap */
    padding-left: calc(var(--ui-space-16) + 4.5rem + var(--ui-space-10));
    height: 0.25rem;
    color: var(--ui-text-tertiary);
    font-size: 0.7rem;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity var(--ui-transition-base), transform var(--ui-transition-base), color var(--ui-transition-base);
    pointer-events: none;
  }

  .cfm-rows.promotable .cfm-promote {
    opacity: 0.85;
    transform: translateY(0);
    color: var(--ui-highlight);
  }

  .cfm-rows.in-sync .cfm-promote {
    opacity: 0;
  }

  .cfm-promote-icon {
    line-height: 1;
  }

  @keyframes cfm-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }
</style>
