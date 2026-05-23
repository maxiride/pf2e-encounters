/**
 * Centralised "flash a transient status, then revert to idle" helper for the
 * file managers (theme / component / manifest). Each pulse — saved, error,
 * adopted — shares the same timing so the UI stays in sync.
 */

export const FLASH_DURATION_MS = 2000;

export interface FlashOptions<S extends string> {
  /** State to revert to after the pulse. Defaults to `'idle'`. */
  idleState?: S;
  /** How long the transient state is shown before reverting. */
  durationMs?: number;
  /** Side effect fired alongside the revert (e.g. clear an inline message). */
  onIdle?: () => void;
}

export function flashStatus<S extends string>(
  set: (state: S) => void,
  transientState: S,
  options: FlashOptions<S> = {},
): void {
  const idleState = options.idleState ?? ('idle' as S);
  const durationMs = options.durationMs ?? FLASH_DURATION_MS;
  set(transientState);
  setTimeout(() => {
    set(idleState);
    options.onIdle?.();
  }, durationMs);
}
