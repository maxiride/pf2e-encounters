<script lang="ts">
  import { run, self } from 'svelte/legacy';

  import { tick } from 'svelte';

  interface Props {
    show?: boolean;
    title?: string;
    cancelLabel?: string;
    showCancel?: boolean;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    width?: string;
    children?: import('svelte').Snippet;
    onconfirm?: () => void;
  }

  let {
    show = $bindable(false),
    title = '',
    cancelLabel = 'Cancel',
    showCancel = true,
    confirmLabel = '',
    confirmDisabled = false,
    width = '500px',
    children,
    onconfirm
  }: Props = $props();

  let closeButtonRef: HTMLButtonElement | undefined = $state();
  let cancelButtonRef: HTMLButtonElement | undefined = $state();
  let confirmButtonRef: HTMLButtonElement | undefined = $state();

  run(() => {
    if (show) {
      tick().then(() => {
        if (confirmLabel && confirmButtonRef) confirmButtonRef.focus();
        else if (showCancel && cancelButtonRef) cancelButtonRef.focus();
        else if (closeButtonRef) closeButtonRef.focus();
      });
    }
  });

  function handleClose() {
    show = false;
  }

  function handleConfirm() {
    onconfirm?.();
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
  <div class="ui-dialog-backdrop" onclick={self(handleClose)}>
    <div class="ui-dialog" style="width: {width}; max-width: {width};">
      {#if title}
        <div class="ui-dialog-header">
          <h3 class="ui-dialog-title">{title}</h3>
          <button bind:this={closeButtonRef} class="ui-dialog-close" onclick={handleClose} aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      {/if}

      <div class="ui-dialog-body">
        {@render children?.()}
      </div>

      {#if showCancel || confirmLabel}
        <div class="ui-dialog-footer">
          {#if showCancel}
            <button bind:this={cancelButtonRef} class="ui-dialog-btn" onclick={handleClose}>
              {cancelLabel}
            </button>
          {/if}
          {#if confirmLabel}
            <button
              bind:this={confirmButtonRef}
              class="ui-dialog-btn primary"
              onclick={handleConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ui-dialog-backdrop {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .ui-dialog {
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 6px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    animation: uiDialogSlideIn 0.15s ease-out;
  }

  @keyframes uiDialogSlideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ui-dialog-header {
    padding: 10px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ui-dialog-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .ui-dialog-close {
    background: none;
    border: none;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .ui-dialog-close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ccc;
  }

  .ui-dialog-body {
    padding: 12px 16px;
  }

  .ui-dialog-footer {
    padding: 10px 16px;
    border-top: 1px solid #333;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .ui-dialog-btn {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid #555;
    border-radius: 4px;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
  }

  .ui-dialog-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    border-color: #777;
    color: #e0e0e0;
  }

  .ui-dialog-btn.primary {
    background: #e8e8e8;
    border-color: #e8e8e8;
    color: #1a1a1a;
    font-weight: 600;
  }

  .ui-dialog-btn.primary:hover:not(:disabled) {
    background: #ffffff;
    border-color: #ffffff;
    color: #1a1a1a;
  }

  .ui-dialog-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
