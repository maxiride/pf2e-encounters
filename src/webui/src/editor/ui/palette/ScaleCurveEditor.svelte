<script lang="ts">
  import BezierCurveEditor from '../BezierCurveEditor.svelte';
  import type { CurveAnchor, CurveConfig } from '../curveEngine';

  

  interface Props {
    /**
   * Single-channel curve editor — one Bezier curve for one channel
   * (lightness or saturation) of one scale (palette / gray-palette /
   * Surfaces / Borders / Text). Instantiated 6+ times across PaletteEditor:
   * the parent's chromatic-palette + gray-palette curves and the four
   * derived-scale curve groups inside OverridesPanel.
   *
   * Pure presentational wrapper: it forwards props to BezierCurveEditor
   * and adapts the offset key into a single `onOffsetChange(value)` so the
   * parent only needs to know how to wire `(key, value)` once (via a
   * closure passed in).
   */
    curveKey: string;
    anchors: CurveAnchor[];
    cfg: CurveConfig;
    stepCount: number;
    defaults: CurveAnchor[];
    offset?: number;
    lockedAnchorIndex?: number | null;
    onAnchorsChange: (anchors: CurveAnchor[]) => void;
    onOffsetChange: (key: string, value: number) => void;
  }

  let {
    curveKey,
    anchors,
    cfg,
    stepCount,
    defaults,
    offset = 0,
    lockedAnchorIndex = null,
    onAnchorsChange,
    onOffsetChange
  }: Props = $props();
</script>

<BezierCurveEditor
  {anchors}
  {cfg}
  {stepCount}
  defaultAnchors={defaults}
  {offset}
  {lockedAnchorIndex}
  {onAnchorsChange}
  onOffsetChange={(v) => onOffsetChange(curveKey, v)}
/>
