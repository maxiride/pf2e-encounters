<script lang="ts">
  import { onMount } from 'svelte';
  import type { ThemeMeta } from '../core/themes/themeTypes';
  import { listThemes, deleteTheme, setActiveFile, getProductionInfo, setProductionFile, sanitizeFileName } from '../core/themes/themeService';
  import { listManifests, saveAsManifest } from '../core/manifests/manifestService';
  import { activeFileName } from '../core/store/editorConfigStore';
  import { dirty } from '../core/store/editorStore';
  import { productionRevision, bumpProductionRevision, themeProductionInfo } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import FileLoadList from './FileLoadList.svelte';
  import FilePill from './FilePill.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  interface Props {
    saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
    onsave?: (payload: { fileName: string; displayName: string }) => void | Promise<void>;
    onload?: (payload: { fileName: string }) => void;
  }

  let { saveStatus = 'idle', onsave, onload }: Props = $props();

  let files: ThemeMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let currentDisplayName = $state('Default Theme');

  type ProdApplyStatus = 'idle' | 'applying' | 'done' | 'error';
  let prodApplyStatus: ProdApplyStatus = $state('idle');
  const setProdApplyStatus = (s: ProdApplyStatus) => (prodApplyStatus = s);

  // Set when Adopt is clicked on a dirty+default theme: the SaveAs dialog opens
  // for the user to name their theme, and on confirm the Adopt resumes
  // automatically so the user gets one flow ("save and adopt") from one click.
  let adoptAfterSave = false;

  let prodIsInSync = $derived($themeProductionInfo?.fileName === $activeFileName);
  let editorIsApplied = $derived(prodIsInSync && !$dirty);
  let prodName = $derived($themeProductionInfo?.name ?? '—');

  let isDefaultActive = $derived($activeFileName === 'default');

  // Display names already in use by protected files. Passed to SaveAsDialog so
  // a user can't shadow the default by typing its label ("Default Theme"),
  // which sanitizes to "default-theme" and would otherwise slip past the
  // filename-only check.
  let protectedDisplayNames = $derived(
    files.filter((f) => f.fileName === 'default').map((f) => f.name),
  );

  async function refreshFiles() {
    try {
      files = await listThemes();
      const active = files.find((f) => f.isActive);
      if (active) {
        $activeFileName = active.fileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent — will show empty list
    }
  }

  async function refreshProduction() {
    try {
      const info = await getProductionInfo();
      themeProductionInfo.set(info);
    } catch {
      // silent — leave cached value in place
    }
  }

  onMount(async () => {
    await refreshFiles();
    await refreshProduction();
  });

  // Refresh production state when any production pointer flips (e.g. a manifest
  // is adopted elsewhere). Skip the initial tick — onMount already loaded it.
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshProduction();
  });

  function handleSave() {
    // Default is read-only — quietly redirect the first Save into Save As so the
    // user gets one motion ("name it, save it") instead of bumping into a
    // disabled button and having to find Save As themselves.
    if (isDefaultActive) {
      openSaveAs();
      return;
    }
    onsave?.({ fileName: $activeFileName, displayName: currentDisplayName });
  }

  function openSaveAs() {
    showFileList = false;
    // Standalone Save As must not piggyback on an Adopt that was cancelled
    // earlier — clear the latch so confirmSaveAs doesn't fire a stale Adopt.
    adoptAfterSave = false;
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    await onsave?.({ fileName, displayName });
    $activeFileName = fileName;
    currentDisplayName = displayName;
    await refreshFiles();
    if (adoptAfterSave) {
      adoptAfterSave = false;
      await handleApplyToProduction();
    }
  }

  // Pick a manifest filename that doesn't collide with anything on disk so
  // auto-creating doesn't clobber a manifest the user customized earlier.
  async function pickFreshManifestName(base: string): Promise<string> {
    const baseFile = sanitizeFileName(base);
    let manifests: { fileName: string }[];
    try {
      manifests = await listManifests();
    } catch {
      return baseFile;
    }
    const taken = new Set(manifests.map((m) => m.fileName));
    if (!taken.has(baseFile)) return baseFile;
    for (let n = 1; n < 1000; n++) {
      const suffix = String(n).padStart(2, '0');
      const candidate = `${baseFile}_${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${baseFile}_${Date.now()}`;
  }

  async function handleApplyToProduction() {
    if (prodIsInSync) return;

    // Dirty edits on the protected default theme can't be saved to that file,
    // and adopting the on-disk default would silently strand the user's
    // changes. Open the theme SaveAs dialog and resume Adopt after save.
    if (isDefaultActive && $dirty) {
      adoptAfterSave = true;
      saveAsDialog = true;
      return;
    }

    prodApplyStatus = 'applying';
    try {
      await setProductionFile($activeFileName);
      await refreshProduction();
      bumpProductionRevision();
      flashStatus(setProdApplyStatus, 'done');
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'ACTIVE_IS_PROTECTED') {
        // Default manifest is active — auto-create a user manifest and retry.
        // No second dialog: the user clicked one button (Adopt) and gave the
        // theme a name; the manifest is bookkeeping they shouldn't have to
        // think about.
        prodApplyStatus = 'idle';
        try {
          const targetName = await pickFreshManifestName('my-manifest');
          await saveAsManifest(targetName, targetName);
        } catch {
          flashStatus(setProdApplyStatus, 'error', { durationMs: 3000 });
          return;
        }
        await handleApplyToProduction();
        return;
      }
      flashStatus(setProdApplyStatus, 'error', { durationMs: 3000 });
    }
  }

  async function handleLoad(file: ThemeMeta) {
    if ($dirty) {
      const ok = window.confirm(
        'Loading a theme will discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    showFileList = false;
    await setActiveFile(file.fileName);
    $activeFileName = file.fileName;
    currentDisplayName = file.name;
    onload?.({ fileName: file.fileName });
  }

  // Two-step arm pattern. First click flips `revertArmed` so the button
  // morphs into a "Discard?" affordance; second click commits. Click-out,
  // Escape, a 3s timeout, or the dirty flag clearing all disarm.
  let revertArmed = $state(false);
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  function disarmRevert() {
    revertArmed = false;
    if (revertTimer) {
      clearTimeout(revertTimer);
      revertTimer = null;
    }
  }

  function handleRevert() {
    if (!$dirty) return;
    if (!revertArmed) {
      revertArmed = true;
      revertTimer = setTimeout(disarmRevert, 3000);
      return;
    }
    disarmRevert();
    onload?.({ fileName: $activeFileName });
  }

  $effect(() => {
    if (!$dirty && revertArmed) disarmRevert();
  });

  $effect(() => {
    if (!revertArmed) return;
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.tfm-revert-btn')) disarmRevert();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') disarmRevert();
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  });

  async function handleDelete(file: ThemeMeta) {
    if (file.fileName === 'default') return;
    if (file.fileName === $themeProductionInfo?.fileName) return;
    try {
      // Capture before refreshFiles() reads the server's reverted active back
      // into local state — otherwise the "was this the active file?" check
      // below sees the post-revert value and skips the reload.
      const wasActive = file.fileName === $activeFileName;
      await deleteTheme(file.fileName);
      await refreshFiles();
      if (wasActive) {
        $activeFileName = 'default';
        currentDisplayName = 'Default Theme';
        onload?.({ fileName: 'default' });
      }
    } catch {
      // silent
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }

</script>

<div class="theme-file-manager">
  <div class="tfm-header">
    <span class="tfm-header-label">Theme</span>
    <UIInfoPopover title="Themes" ariaLabel="About themes">
      <p>
        A <strong>theme</strong> saves the design tokens for a site, components use these tokens to define their appearance.
      </p>
    </UIInfoPopover>
  </div>

  <div class="tfm-cards" class:in-sync={prodIsInSync}>
    <div
      class="tfm-card tfm-card-editor"
      class:dirty={$dirty}
      class:applied={editorIsApplied}
    >
      <span class="tfm-rail" aria-hidden="true"></span>
      <div class="tfm-card-head">
        <span class="tfm-card-label">Editor</span>
        <span
          class="tfm-card-status"
          class:dirty={$dirty}
          class:applied={editorIsApplied}
        >
          <i class="tfm-status-dot" aria-hidden="true"></i>
          <span>{$dirty ? 'unsaved' : editorIsApplied ? 'live' : 'saved'}</span>
          {#if $dirty}
            <button
              type="button"
              class="tfm-revert-btn"
              class:armed={revertArmed}
              onclick={handleRevert}
              title={revertArmed
                ? 'Click again to discard unsaved changes'
                : 'Revert to last saved version'}
              aria-label={revertArmed ? 'Confirm discard unsaved changes' : 'Revert unsaved changes'}
            >
              <i class="fas fa-rotate-left" aria-hidden="true"></i>
              {#if revertArmed}<span class="tfm-revert-label">Discard?</span>{/if}
            </button>
          {/if}
        </span>
      </div>
      <FilePill
        name={currentDisplayName}
        isProtected={isDefaultActive}
        dirty={$dirty}
        applied={editorIsApplied}
        protectedTitle="Protected system theme"
        title={currentDisplayName}
        style="display: flex;"
      />
      <div class="tfm-card-actions tfm-card-actions-stack">
        <button
          class="tfm-btn tfm-btn-row save-btn"
          class:saving={saveStatus === 'saving'}
          class:saved={saveStatus === 'saved'}
          class:error={saveStatus === 'error'}
          onclick={handleSave}
          disabled={saveStatus === 'saving'}
          title={isDefaultActive
            ? 'Save to a new theme file'
            : 'Save to current file'}
        >
          <i
            class="fas"
            class:fa-save={saveStatus === 'idle'}
            class:fa-spinner={saveStatus === 'saving'}
            class:fa-check={saveStatus === 'saved'}
            class:fa-times={saveStatus === 'error'}
          ></i>
          <span>
            {#if saveStatus === 'idle'}Save{:else if saveStatus === 'saving'}Saving{:else if saveStatus === 'saved'}Saved{:else}Error{/if}
          </span>
        </button>
        <button class="tfm-btn tfm-btn-row" onclick={openSaveAs} title="Save as new theme">
          <i class="fas fa-copy"></i>
          <span>Save As…</span>
        </button>
        <button
          class="tfm-btn tfm-btn-row"
          class:active={showFileList}
          onclick={toggleFileList}
          title="Load a theme"
        >
          <i class="fas fa-folder-open"></i>
          <span>Load…</span>
        </button>
      </div>
    </div>

    <button
      class="tfm-adopt-btn"
      class:saving={prodApplyStatus === 'applying'}
      class:saved={prodApplyStatus === 'done'}
      class:error={prodApplyStatus === 'error'}
      class:in-sync={prodIsInSync}
      onclick={handleApplyToProduction}
      disabled={prodApplyStatus === 'applying' || prodIsInSync}
      title={prodIsInSync
        ? 'This theme is already in production'
        : `Adopt "${currentDisplayName}" as the production theme`}
    >
      <i
        class="fas"
        class:fa-arrow-down={prodApplyStatus === 'idle'}
        class:fa-spinner={prodApplyStatus === 'applying'}
        class:fa-check={prodApplyStatus === 'done'}
        class:fa-xmark={prodApplyStatus === 'error'}
      ></i>
      <span>
        {#if prodApplyStatus === 'idle'}Adopt{:else if prodApplyStatus === 'applying'}Adopting{:else if prodApplyStatus === 'done'}Adopted{:else}Error{/if}
      </span>
    </button>

    <div
      class="tfm-card tfm-card-production"
      class:in-sync={prodIsInSync}
    >
      <span class="tfm-rail" aria-hidden="true"></span>
      <div class="tfm-card-head">
        <span class="tfm-card-label">Production</span>
        <span
          class="tfm-card-status"
          class:applied={prodIsInSync}
        >
          <i class="tfm-status-dot" aria-hidden="true"></i>
          <span>{prodIsInSync ? 'live' : 'out of sync'}</span>
        </span>
      </div>
      <FilePill
        name={prodName}
        isProtected={$themeProductionInfo?.fileName === 'default'}
        applied={prodIsInSync}
        protectedTitle="Protected system theme"
        title={prodName}
        style="display: flex;"
      />
    </div>
  </div>
</div>

<FileLoadList
  bind:show={showFileList}
  title="Load Theme"
  {files}
  activeFileName={$activeFileName}
  sortable
  showUpdatedAt
  systemBadge={{ label: 'system', title: 'Protected system theme' }}
  emptyMessage="No saved files"
  canDelete={(file) => file.fileName !== 'default' && file.fileName !== $themeProductionInfo?.fileName}
  onload={handleLoad}
  ondelete={handleDelete}
/>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  currentFileName={$activeFileName}
  reservedDisplayNames={protectedDisplayNames}
  title="Save Theme As"
  placeholder="Theme name…"
  reservedNameMessage='That name is reserved for the protected default theme.'
  branchFromDefaultName="My Theme"
  onsave={confirmSaveAs}
/>

<style>
  .theme-file-manager {
    --tfm-applied: #5aa85e;
    --tfm-rail-neutral: var(--ui-border);
    --tfm-rail-dirty: var(--ui-highlight);
    --tfm-rail-applied: var(--tfm-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .tfm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    padding: 0 var(--ui-space-4);
  }

  .tfm-header-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
  }

  /* Two-card pipeline (Editor → Production) — theme card + production card
     surface the per-artifact pipeline. The manifest panel sits one level up
     and tracks active vs default rather than editor vs production. */
  .tfm-cards {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .tfm-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .tfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--tfm-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .tfm-card-editor.dirty .tfm-rail { background: var(--tfm-rail-dirty); }
  .tfm-card-editor.applied .tfm-rail { background: var(--tfm-rail-applied); }
  .tfm-card-production.in-sync .tfm-rail { background: var(--tfm-rail-applied); }

  .tfm-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .tfm-card-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    text-transform: uppercase;
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .tfm-card-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.7rem;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .tfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tfm-card-status.dirty {
    color: var(--ui-highlight);
  }

  .tfm-card-status.dirty .tfm-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: tfm-pulse 1.6s ease-in-out infinite;
  }

  .tfm-card-status.applied {
    color: var(--tfm-applied);
  }
  .tfm-card-status.applied .tfm-status-dot {
    opacity: 1;
  }

  /* Revert button — paired with the "unsaved" status label. Lives only when
     dirty, in the highlight color so it reads as part of the status group
     rather than a peer of the action stack below. Two-step arm: first click
     adds .armed (label appears, fills with highlight), second click commits. */
  .tfm-revert-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 18px;
    margin-left: 2px;
    padding: 0 4px;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ui-highlight) 35%, transparent);
    border-radius: 4px;
    color: var(--ui-highlight);
    font-size: 0.65rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.85;
    overflow: hidden;
    transition:
      background var(--ui-transition-fast),
      border-color var(--ui-transition-fast),
      color var(--ui-transition-fast),
      opacity var(--ui-transition-fast),
      padding var(--ui-transition-fast);
  }

  .tfm-revert-btn:hover {
    background: color-mix(in srgb, var(--ui-highlight) 18%, transparent);
    border-color: color-mix(in srgb, var(--ui-highlight) 65%, transparent);
    opacity: 1;
  }

  .tfm-revert-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--ui-highlight) 60%, transparent);
    outline-offset: 1px;
  }

  .tfm-revert-btn i {
    font-size: 0.65rem;
    transition: transform var(--ui-transition-fast);
  }

  .tfm-revert-btn.armed {
    background: var(--ui-highlight);
    border-color: var(--ui-highlight);
    color: var(--ui-surface-lowest, #111);
    opacity: 1;
    padding: 0 6px;
  }

  .tfm-revert-btn.armed i {
    transform: rotate(-35deg);
  }

  .tfm-revert-label {
    font-weight: var(--ui-font-weight-semibold, 600);
    white-space: nowrap;
  }

  /* Time-window cue — thin bar drains across the bottom edge as the 3s
     auto-disarm window elapses. Pure CSS, runs once per arm cycle. */
  .tfm-revert-btn.armed::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    background: color-mix(in srgb, var(--ui-surface-lowest, #111) 70%, transparent);
    transform-origin: left center;
    animation: tfm-revert-drain 3s linear forwards;
  }

  @keyframes tfm-revert-drain {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }

  .tfm-card-actions {
    display: flex;
    gap: var(--ui-space-4);
    flex-wrap: wrap;
  }

  .tfm-card-actions-stack {
    flex-direction: column;
  }

  .tfm-btn-row {
    width: 100%;
    justify-content: flex-start;
    gap: var(--ui-space-8);
    flex: 0 0 auto;
    text-align: left;
  }

  .tfm-btn-row i {
    width: 1rem;
    text-align: center;
    flex: 0 0 auto;
  }

  .tfm-btn-row span {
    flex: 1 1 auto;
    text-align: left;
  }

  /* Bridge button — sits between Editor and Production cards as the arrow that
     promotes the editor theme into production. */
  .tfm-adopt-btn {
    align-self: stretch;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    margin: calc(var(--ui-space-2) * -1) 0;
    padding: var(--ui-space-6) var(--ui-space-12);
    background: color-mix(in srgb, var(--tfm-applied) 18%, var(--ui-surface-high));
    border: 1px solid color-mix(in srgb, var(--tfm-applied) 45%, var(--ui-border-high));
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }

  .tfm-adopt-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .tfm-adopt-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--tfm-applied) 30%, var(--ui-surface-higher));
    border-color: color-mix(in srgb, var(--tfm-applied) 70%, var(--ui-border-higher));
  }

  .tfm-adopt-btn:disabled {
    cursor: not-allowed;
  }

  .tfm-adopt-btn.in-sync {
    background: transparent;
    border-color: var(--ui-border-low);
    color: var(--ui-text-muted);
    opacity: 0.7;
  }

  .tfm-adopt-btn.saving i { animation: spin 1s linear infinite; }
  .tfm-adopt-btn.saved {
    background: color-mix(in srgb, var(--tfm-applied) 30%, var(--ui-surface-high));
    color: var(--tfm-applied);
  }
  .tfm-adopt-btn.error { color: var(--ui-text-muted); }

  .tfm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    flex: 1 1 0;
    min-width: 0;
  }

  .tfm-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .tfm-btn:hover:not(:disabled) {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .tfm-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tfm-btn.active {
    background: var(--ui-surface);
    border-color: var(--ui-border);
    color: var(--ui-text-primary);
  }

  .save-btn {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-high);
    color: var(--ui-text-primary);
  }

  .save-btn:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-higher);
  }

  .save-btn.saving i { animation: spin 1s linear infinite; }
  .save-btn.saved {
    background: var(--ui-surface-highest);
    color: var(--ui-text-success);
  }
  .save-btn.error {
    background: var(--ui-surface-high);
    color: var(--ui-text-muted);
  }

  @keyframes tfm-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
