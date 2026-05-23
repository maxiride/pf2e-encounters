/**
 * Svelte action: keep an absolutely-positioned element inside the viewport.
 *
 * Measures the element after layout, computes how far it overflows any
 * viewport edge, and shifts it back via CSS `translate`. The original
 * positioning (top/left/right/bottom) stays untouched so the *natural*
 * placement is preserved when there's room — the action only nudges when
 * the element would otherwise draw off-screen.
 *
 * Use on popovers and dropdowns whose trigger position is dynamic
 * (cards in a wrapping flex grid, dropdowns near a panel edge, etc.).
 *
 * The CSS `translate` property is used instead of `transform` so it doesn't
 * collide with `transform`-based entrance animations.
 *
 * Recomputes on:
 *  - mount (after first paint)
 *  - element resize (content reflow)
 *  - window resize
 *  - any scroll up the ancestor chain
 *
 * Usage:
 *   <div class="popover" use:keepInViewport>...</div>
 *   <div class="popover" use:keepInViewport={{ margin: 12 }}>...</div>
 */

export type KeepInViewportOptions = {
  /** Minimum gap (px) between the element and the viewport edges. Default 8. */
  margin?: number;
};

export function keepInViewport(
  node: HTMLElement,
  options: KeepInViewportOptions = {},
) {
  let margin = options.margin ?? 8;
  let pendingFrame: number | null = null;

  function measure(): void {
    if (pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      // Reset our own translate before measuring so the rect reflects the
      // element's natural placement, not last frame's correction.
      node.style.translate = '';
      const rect = node.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let dx = 0;
      let dy = 0;
      if (rect.left < margin) dx = margin - rect.left;
      else if (rect.right > vw - margin) dx = vw - margin - rect.right;
      if (rect.top < margin) dy = margin - rect.top;
      else if (rect.bottom > vh - margin) dy = vh - margin - rect.bottom;
      if (dx !== 0 || dy !== 0) {
        node.style.translate = `${dx}px ${dy}px`;
      }
    });
  }

  measure();

  const ro = new ResizeObserver(measure);
  ro.observe(node);
  window.addEventListener('resize', measure);
  // Capture-phase scroll listener: catches scroll on any ancestor, not just
  // window. The trigger's nearest scrolling parent (a panel, a modal body)
  // shifts the popover's viewport position when scrolled.
  window.addEventListener('scroll', measure, true);

  return {
    update(next: KeepInViewportOptions = {}) {
      margin = next.margin ?? 8;
      measure();
    },
    destroy() {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      node.style.translate = '';
    },
  };
}
