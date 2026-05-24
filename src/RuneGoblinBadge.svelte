<script lang="ts">
  import goblinSliceUrl from './assets/runegoblin-slice-small.webp';
  import runegoblinTitleSvg from './assets/runegoblin-title.svg?raw';

  /* Source dimensions of the goblin webp — used to compute the badge's
     intrinsic width so the parent layout doesn't need to know about it. */
  const IMG_W = 332;
  const IMG_H = 128;
</script>

<a
  class="runegoblin-badge"
  href="https://runegoblin.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Rune Goblin"
  style:--img-aspect={`${IMG_W} / ${IMG_H}`}
>
  <div class="goblin-clip">
    <img src={goblinSliceUrl} alt="" class="goblin-img" />
  </div>
  <div class="rune-overlay">
    {@html runegoblinTitleSvg}
  </div>
</a>

<style>
  .runegoblin-badge {
    /* The label overhangs the image to the right by this amount; the badge's
       own width includes that overhang so its bounding box matches its
       visible footprint — no negative margins leaking into the parent. */
    --rune-overhang: 156px;
    --badge-height: 64px;
    --label-height: 48px;

    position: relative;
    flex-shrink: 0;
    height: var(--badge-height);
    width: calc(var(--badge-height) * var(--img-aspect) + var(--rune-overhang));
    line-height: 0;
    isolation: isolate;
    display: block;
    cursor: pointer;
    text-decoration: none;
  }
  /* Wraps the image so the scale-on-hover clips only vertically — his ear
     can extend past the left edge when he leans forward, while the top and
     bottom stay clipped to the badge height. The title overhang sits above
     any rightward bleed via the .rune-overlay layer. */
  .goblin-clip {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    width: calc(var(--badge-height) * var(--img-aspect));
    clip-path: inset(0 -100% 0 -100%);
  }
  .goblin-img {
    height: 100%;
    width: auto;
    display: block;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
    user-select: none;
    transform-origin: center center;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .runegoblin-badge:hover .goblin-img,
  .runegoblin-badge:focus-visible .goblin-img {
    transform: scale(1.12);
  }
  .rune-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    /* SVG sits flush at the bottom-right of the badge — which is the
       overhang corner, past the image's right edge. */
    align-items: flex-end;
    justify-content: flex-end;
    pointer-events: none;
  }
  .rune-overlay :global(svg) {
    height: var(--label-height);
    width: auto;
    display: block;
    overflow: visible;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.75));
  }
  /* Orange fill is clipped offscreen below the text by default. */
  .rune-overlay :global(.rune-reveal) {
    transition: y 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .runegoblin-badge:hover .rune-overlay :global(.rune-reveal) {
    y: -30px;
  }
</style>
