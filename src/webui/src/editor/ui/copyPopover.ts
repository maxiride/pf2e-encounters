import { writable } from 'svelte/store';

export type CopyPopoverState = {
  visible: boolean;
  value: string;
  /** Viewport-relative anchor rect for the trigger element. */
  anchor: { top: number; left: number; width: number; height: number } | null;
  /** Monotonic id so consecutive copies of the same value re-trigger the timer. */
  nonce: number;
};

const initial: CopyPopoverState = { visible: false, value: '', anchor: null, nonce: 0 };

export const copyPopover = writable<CopyPopoverState>(initial);

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showCopyPopover(value: string, target: EventTarget | null, durationMs = 1500) {
  const el = target instanceof Element ? target : null;
  const rect = el?.getBoundingClientRect() ?? null;
  const anchor = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null;

  copyPopover.update((s) => ({ visible: true, value, anchor, nonce: s.nonce + 1 }));

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    copyPopover.update((s) => ({ ...s, visible: false }));
    hideTimer = null;
  }, durationMs);
}
