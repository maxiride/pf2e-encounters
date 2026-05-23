<script lang="ts">
  /**
   * Color/opacity picker for a single gradient stop. Reuses UIPaletteSelector's
   * dropdown UI by mounting it against a per-stop "scratch" CSS variable; writes
   * to that scratch var get parsed back out and forwarded as a structured update
   * to gradient state, so we don't have to refactor UIPaletteSelector itself.
   */
  import UIPaletteSelector from './UIPaletteSelector.svelte';
  import { setCssVar, removeCssVar } from '../core/cssVarSync';

  interface Props {
    stopId: string; // unique key (e.g. gradient-var + stop index)
    color: string; // token name like '--color-brand-500'
    opacity?: number; // 0–100
    /** Forwarded to UIPaletteSelector to scope picks to a color family.
     *  See UIPaletteSelector's `familyFilter` for accepted values. */
    familyFilter?: string | null;
    onchange?: (payload: { color: string; opacity: number }) => void;
  }

  let { stopId, color, opacity = 100, familyFilter = null, onchange }: Props = $props();

  /** Scratch var the embedded picker reads/writes; isolated per stop. */
  let scratchVar = $derived(`--__grad-stop-${stopId}`);

  function buildScratchValue(c: string, o: number): string {
    const base = c.startsWith('--') ? `var(${c})` : c;
    if (o >= 100) return base;
    return `color-mix(in srgb, ${base} ${Math.round(o)}%, transparent)`;
  }

  /** Parse a scratch var write back into structured stop fields. UIPaletteSelector's
   *  "None" choice writes the literal `transparent`; we round-trip it as a stop
   *  whose color is the keyword itself — `formatGradientStopColor` already passes
   *  non-`--` colors through verbatim, so the gradient (or solid first-stop) ends
   *  up painting `transparent`. */
  function parseScratch(raw: string): { color: string; opacity: number } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed === 'transparent') return { color: 'transparent', opacity: 100 };
    const mixMatch = trimmed.match(/^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/i);
    if (mixMatch) {
      return { color: mixMatch[1], opacity: parseFloat(mixMatch[2]) };
    }
    const varMatch = trimmed.match(/^var\((--[a-z0-9-]+)\)$/);
    if (varMatch) {
      return { color: varMatch[1], opacity: 100 };
    }
    return null;
  }

  // Seed (and re-seed on external updates like undo/redo) the scratch var so
  // UIPaletteSelector reads the current stop value. The effect's cleanup runs
  // on dependency change AND unmount, so it removes the right key even if
  // stopId changes mid-life.
  $effect(() => {
    setCssVar(scratchVar, buildScratchValue(color, opacity));
    const key = scratchVar;
    return () => removeCssVar(key);
  });

  function handleChange() {
    const raw = document.documentElement.style.getPropertyValue(scratchVar);
    const parsed = parseScratch(raw);
    if (!parsed) return;
    if (parsed.color === color && parsed.opacity === opacity) return;
    onchange?.(parsed);
  }
</script>

<UIPaletteSelector variable={scratchVar} {familyFilter} onchange={handleChange} />
