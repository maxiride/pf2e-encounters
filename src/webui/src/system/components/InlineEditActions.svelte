<script lang="ts">
   

   interface Props {
      /**
    * Reusable inline edit action buttons (confirm/cancel)
    * Used for inline editing throughout the app
    */
      onSave: () => void | Promise<void>;
      onCancel: () => void;
      disabled?: boolean;
      saveTitle?: string;
      cancelTitle?: string;
      class?: string;
   }

   let {
      onSave,
      onCancel,
      disabled = false,
      saveTitle = "Save",
      cancelTitle = "Cancel",
      class: className = ''
   }: Props = $props();
   
</script>

<div class="inline-actions {className}">
   <button
      class="save-btn"
      type="button"
      onclick={onSave}
      {disabled}
      title={saveTitle}
   >
      <i class="fas fa-check"></i>
   </button>
   <button
      class="cancel-btn"
      type="button"
      onclick={onCancel}
      disabled={disabled}
      title={cancelTitle}
   >
      <i class="fas fa-times"></i>
   </button>
</div>

<style lang="scss">
   @use '../styles/padding' as *;

   :global(:root) {
      /* Save (default) */
      --inlineeditactions-save-default-surface: var(--surface-success-low);
      --inlineeditactions-save-default-text: var(--text-success);
      --inlineeditactions-save-default-border: var(--border-success);
      --inlineeditactions-save-default-border-width: var(--border-width-0);
      --inlineeditactions-save-default-radius: var(--radius-md);
      --inlineeditactions-save-default-padding: var(--space-4);
      --inlineeditactions-save-default-icon-size: var(--icon-size-md);

      /* Save (hover) */
      --inlineeditactions-save-hover-surface: var(--surface-success-high);
      --inlineeditactions-save-hover-text: var(--text-success);
      --inlineeditactions-save-hover-border: var(--border-success);
      --inlineeditactions-save-hover-border-width: var(--border-width-0);
      --inlineeditactions-save-hover-radius: var(--radius-md);
      --inlineeditactions-save-hover-padding: var(--space-4);
      --inlineeditactions-save-hover-icon-size: var(--icon-size-md);

      /* Cancel (default) */
      --inlineeditactions-cancel-default-surface: var(--surface-danger-low);
      --inlineeditactions-cancel-default-text: var(--text-danger);
      --inlineeditactions-cancel-default-border: var(--border-danger);
      --inlineeditactions-cancel-default-border-width: var(--border-width-0);
      --inlineeditactions-cancel-default-radius: var(--radius-md);
      --inlineeditactions-cancel-default-padding: var(--space-4);
      --inlineeditactions-cancel-default-icon-size: var(--icon-size-md);

      /* Cancel (hover) */
      --inlineeditactions-cancel-hover-surface: var(--surface-danger-high);
      --inlineeditactions-cancel-hover-text: var(--text-danger);
      --inlineeditactions-cancel-hover-border: var(--border-danger);
      --inlineeditactions-cancel-hover-border-width: var(--border-width-0);
      --inlineeditactions-cancel-hover-radius: var(--radius-md);
      --inlineeditactions-cancel-hover-padding: var(--space-4);
      --inlineeditactions-cancel-hover-icon-size: var(--icon-size-md);
   }

   .inline-actions {
      display: flex;
      gap: var(--space-8);
   }

   .save-btn,
   .cancel-btn {
      cursor: pointer;
      transition: all var(--duration-200);
      display: flex;
      align-items: center;
      gap: var(--space-8);

      &:disabled {
         background: var(--surface-neutral-low);
         color: var(--text-disabled);
         cursor: not-allowed;
      }
   }

   .save-btn {
      background: var(--inlineeditactions-save-default-surface);
      color: var(--inlineeditactions-save-default-text);
      border: var(--inlineeditactions-save-default-border-width) solid var(--inlineeditactions-save-default-border);
      border-radius: var(--inlineeditactions-save-default-radius);
      @include themed-padding(--inlineeditactions-save-default-padding, $h: 2);
      font-size: var(--inlineeditactions-save-default-icon-size);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-save-hover-surface);
         color: var(--inlineeditactions-save-hover-text);
         border: var(--inlineeditactions-save-hover-border-width) solid var(--inlineeditactions-save-hover-border);
         border-radius: var(--inlineeditactions-save-hover-radius);
         @include themed-padding(--inlineeditactions-save-hover-padding, $h: 2);
         font-size: var(--inlineeditactions-save-hover-icon-size);
      }
   }

   .cancel-btn {
      background: var(--inlineeditactions-cancel-default-surface);
      color: var(--inlineeditactions-cancel-default-text);
      border: var(--inlineeditactions-cancel-default-border-width) solid var(--inlineeditactions-cancel-default-border);
      border-radius: var(--inlineeditactions-cancel-default-radius);
      @include themed-padding(--inlineeditactions-cancel-default-padding, $h: 2);
      font-size: var(--inlineeditactions-cancel-default-icon-size);

      &:hover:not(:disabled),
      .inline-actions.force-hover &:not(:disabled) {
         background: var(--inlineeditactions-cancel-hover-surface);
         color: var(--inlineeditactions-cancel-hover-text);
         border: var(--inlineeditactions-cancel-hover-border-width) solid var(--inlineeditactions-cancel-hover-border);
         border-radius: var(--inlineeditactions-cancel-hover-radius);
         @include themed-padding(--inlineeditactions-cancel-hover-padding, $h: 2);
         font-size: var(--inlineeditactions-cancel-hover-icon-size);
      }
   }
</style>
