<script lang="ts">
  import { run } from 'svelte/legacy';

  import { sanitizeFileName } from '../../core/themes/themeService';
  import UIDialog from '../../ui/UIDialog.svelte';

  interface Props {
    /** Two-way bound: parent toggles to open/close. */
    show?: boolean;
    /** Display name to seed the input with when the dialog opens. */
    currentDisplayName?: string;
    /** Existing files used by the increment helper to find the next available `_NN` suffix.
     *  Only `fileName` is read, so this accepts any shape with that field
     *  (ComponentConfigMeta, ManifestMeta, …). */
    files?: { fileName: string }[];
    /** Dialog title — defaults to "Save As". Overridable so callers can use
     *  context-specific framing (e.g. "Save Manifest As"). */
    title?: string;
    /** Placeholder shown in the empty input. */
    placeholder?: string;
    /** Error message shown when the user types the reserved "default" name.
     *  Default copy references components; manifests should override. */
    reservedNameMessage?: string;
    /** Optional one-line explanation rendered above the name input. Use when
     *  the dialog opens automatically (e.g. as a recovery prompt) so the user
     *  understands what's about to be saved and why the prompt appeared. */
    description?: string;
    /** Seed value to use when branching off the protected `default` file.
     *  Without this the dialog falls back to incrementing the default's display
     *  name (e.g. "Default Theme_01"), which reads as a derivative of the
     *  reserved name. Pass a fresh, neutral suggestion (e.g. "My Theme") so
     *  the user's first save isn't named after the slot they can't overwrite. */
    branchFromDefaultName?: string;
    /** Active file's basename. Authoritative source for "are we branching from
     *  the protected default?" — the displayName-based check below fails when
     *  the default's display name doesn't sanitize to "default" (e.g. themes
     *  whose default is named "Default Theme" → "default-theme"). */
    currentFileName?: string;
    /** Display names that already belong to protected/system files. Blocked
     *  case-insensitively so a user can't shadow the default by reusing its
     *  display label even when the sanitized filename would differ. */
    reservedDisplayNames?: string[];
    onsave?: (payload: { displayName: string; fileName: string }) => void;
  }

  let {
    show = $bindable(false),
    currentDisplayName = '',
    files = [],
    title = 'Save As',
    placeholder = 'Config name…',
    reservedNameMessage = 'The name "default" is reserved for the core component definition.',
    description = '',
    branchFromDefaultName = '',
    currentFileName = '',
    reservedDisplayNames = [],
    onsave,
  }: Props = $props();

  let saveAsName = $state('');
  let saveAsInput: HTMLInputElement | undefined = $state();



  function nextIncrementName(baseDisplay: string): { displayName: string; fileName: string } {
    const baseName = baseDisplay.replace(/_\d+$/, '');
    const baseFileName = sanitizeFileName(baseName);
    const existingNums = files
      .filter(
        (f) =>
          f.fileName === baseFileName ||
          f.fileName.match(new RegExp(`^${baseFileName}_\\d+$`)),
      )
      .map((f) => {
        const m = f.fileName.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const next = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const suffix = String(next).padStart(2, '0');
    return { displayName: `${baseName}_${suffix}`, fileName: `${baseFileName}_${suffix}` };
  }

  function incrementSaveAsName() {
    saveAsName = nextIncrementName(saveAsName).displayName;
    setTimeout(() => saveAsInput?.select(), 0);
  }

  function confirmSaveAs() {
    const displayName = saveAsName.trim();
    if (!displayName || saveAsError) return;
    const fileName = sanitizeFileName(displayName);
    show = false;
    onsave?.({ displayName, fileName });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmSaveAs();
  }
  // Seed and select the input whenever the dialog opens. setTimeout(..., 0)
  // matches the original parent's behaviour: it runs as a macrotask, after
  // UIDialog's microtask-queued focus on the confirm button — so the input
  // ends up focused-and-selected, not the button.
  run(() => {
    if (show) {
      const trimmedCurrent = currentDisplayName.trim().toLowerCase();
      const isReservedDisplay = reservedDisplayNames.some(
        (n) => n.trim().toLowerCase() === trimmedCurrent,
      );
      // Three paths funnel into the branch suggestion:
      //   1. Active is the literal `default` file.
      //   2. Current displayName itself sanitizes to "default".
      //   3. Current displayName collides with a reserved label (e.g. a stray
      //      user file already named "Default Theme") — re-seeding with their
      //      old name would trip the validator on submit.
      const isFromDefault =
        currentFileName === 'default' ||
        sanitizeFileName(currentDisplayName) === 'default' ||
        isReservedDisplay;
      if (isFromDefault) {
        saveAsName = branchFromDefaultName
          ? branchFromDefaultName
          : nextIncrementName(currentDisplayName).displayName;
      } else {
        saveAsName = currentDisplayName;
      }
      setTimeout(() => saveAsInput?.select(), 0);
    }
  });
  let saveAsError = $derived((() => {
    const trimmed = saveAsName.trim();
    if (!trimmed) return '';
    if (sanitizeFileName(trimmed) === 'default') {
      return reservedNameMessage;
    }
    const lowered = trimmed.toLowerCase();
    if (reservedDisplayNames.some((n) => n.trim().toLowerCase() === lowered)) {
      return reservedNameMessage;
    }
    return '';
  })());
</script>

<UIDialog
  bind:show
  {title}
  cancelLabel="Cancel"
  confirmLabel="Save"
  confirmDisabled={!saveAsName.trim() || !!saveAsError}
  onconfirm={confirmSaveAs}
  width="360px"
>
  <div class="save-as-dialog">
    {#if description}
      <p class="save-as-description">{description}</p>
    {/if}
    <div class="save-as-row">
      <input
        class="save-as-input"
        class:invalid={!!saveAsError}
        type="text"
        bind:value={saveAsName}
        bind:this={saveAsInput}
        onkeydown={handleKeydown}
        {placeholder}
      />
      <button
        type="button"
        class="save-as-increment"
        onclick={incrementSaveAsName}
        title="Increment filename"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>
    {#if saveAsError}
      <p class="save-as-error" role="alert">{saveAsError}</p>
    {/if}
  </div>
</UIDialog>

<style>
  .save-as-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .save-as-row {
    display: flex;
    align-items: stretch;
    gap: var(--ui-space-6);
  }

  .save-as-input {
    flex: 1;
    min-width: 0;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    outline: none;
  }

  .save-as-increment {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .save-as-increment:hover {
    background: var(--ui-surface);
    border-color: var(--ui-border);
    color: var(--ui-text-primary);
  }

  .save-as-input:focus {
    border-color: var(--ui-border-high);
  }

  .save-as-input.invalid,
  .save-as-input.invalid:focus {
    border-color: var(--ui-highlight);
  }

  .save-as-input::placeholder {
    color: var(--ui-text-muted);
  }

  .save-as-error {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-highlight);
  }

  .save-as-description {
    margin: 0;
    font-size: var(--ui-font-size-xs);
    line-height: 1.5;
    color: var(--ui-text-secondary);
  }
</style>
