const PRELUDE_PX = 128;
const DURATION_MS = 400;
const SPEED_PX_PER_MS = PRELUDE_PX / DURATION_MS;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function findScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement ?? document.documentElement;
}

export function scrollSectionIntoView(target: HTMLElement, scroller?: HTMLElement) {
  const scrollEl = scroller ?? findScrollParent(target);
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  const targetTop = Math.max(0, Math.min(max, target.offsetTop));
  const start = scrollEl.scrollTop;
  const delta = targetTop - start;
  if (delta === 0) return;

  const direction = delta > 0 ? 1 : -1;
  const distance = Math.abs(delta);
  const animatedDistance = Math.min(distance, PRELUDE_PX);
  const duration = animatedDistance / SPEED_PX_PER_MS;

  const animFrom = targetTop - animatedDistance * direction;
  scrollEl.scrollTop = animFrom;

  const t0 = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - t0) / duration);
    scrollEl.scrollTop = animFrom + animatedDistance * direction * easeOutCubic(t);
    if (t < 1) requestAnimationFrame(step);
    else scrollEl.scrollTop = targetTop;
  }
  requestAnimationFrame(step);
}
