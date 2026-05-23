<script module lang="ts">
  // __PROJECT_ROOT__ / __APP_VERSION__ are Vite-injected defines.
  declare const __PROJECT_ROOT__: string | undefined;
  declare const __APP_VERSION__: string | undefined;
  const INJECTED_PROJECT_ROOT: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';
  const APP_VERSION: string =
    typeof __APP_VERSION__ !== 'undefined' ? (__APP_VERSION__ ?? '') : '';
</script>

<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { route, navigate } from '../core/routing/router';
  import { columnsVisible, toggleColumns } from './columnsOverlay';
  import { storageKey } from '../core/store/editorConfig';
  import { overlayOpen } from './overlayState';
  import { quietGet, quietSet } from '../core/storage/storage';
  import { postParentRoute } from '../core/routing/parentRouteStore';
  import UIPillButton from '../ui/UIPillButton.svelte';
  import type { NavLink } from '../core/routing/navLinkTypes';

  interface Props {
    open?: boolean | undefined;
    editorPath?: string;
    navLinks?: NavLink[];
    pageSources?: Record<string, string>;
    hidePageSourceOn?: string[];
    projectRoot?: string;
  }

  let {
    open = $bindable(undefined),
    editorPath = '/editor',
    navLinks = [],
    pageSources = {},
    hidePageSourceOn = [],
    projectRoot = INJECTED_PROJECT_ROOT
  }: Props = $props();

  // Dev-only; skip inside iframe (editor route embeds this app).
  const isDev = import.meta.env.DEV;
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  const enabled = isDev && !isInIframe;

  // Persist `open` only when consumer doesn't bind it.
  const OPEN_KEY = storageKey('overlay-open');
  const consumerControlsOpen = open !== undefined;
  if (!consumerControlsOpen) {
    open = enabled && quietGet(OPEN_KEY) === '1';
  }
  run(() => {
    if (!consumerControlsOpen && typeof window !== 'undefined') {
      quietSet(OPEN_KEY, open ? '1' : '0');
    }
  });
  run(() => {
    overlayOpen.set(!!open);
  });

  // Reserve right-side scroll room equal to the docked panel width so the user
  // can scroll horizontally to reveal content the fixed overlay would otherwise
  // hide. Only docked-open consumes layout; floating/closed leaves it at 0.
  run(() => {
    if (typeof document === 'undefined') return;
    const w = enabled && open && mode === 'docked' ? dockedWidth : 0;
    document.documentElement.style.setProperty('--lt-overlay-scroll-pad', `${w}px`);
  });

  // Editor route has its own chrome — hide overlay there.
  let onEditorPath = $derived($route === editorPath);
  let sourceFile = $derived(pageSources[$route]);
  let showSource = $derived(!!sourceFile && !!projectRoot && !hidePageSourceOn.includes($route));

  // Mount iframe on first open, then keep it to preserve editor state across hide/show.
  let hasBeenOpen: boolean = $state(!!open);
  run(() => {
    if (open) hasBeenOpen = true;
  });

  let editorFrame: HTMLIFrameElement | undefined = $state();
  run(() => {
    postParentRoute(editorFrame?.contentWindow, $route);
  });

  type Mode = 'docked' | 'floating';

  const STORAGE_KEY = storageKey('overlay-state');
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 480;
  const DEFAULT_DOCKED_WIDTH = Math.min(960, Math.floor(window.innerWidth * 0.55));
  const DEFAULT_FLOATING = {
    x: Math.max(16, window.innerWidth - 960 - 32),
    y: 64,
    width: 960,
    height: Math.min(880, window.innerHeight - 96),
  };

  interface OverlayState {
    mode: Mode;
    dockedWidth: number;
    floating: { x: number; y: number; width: number; height: number };
  }

  function loadState(): OverlayState {
    const parsed = quietGet<Partial<OverlayState>>(STORAGE_KEY, { parse: true });
    if (parsed && typeof parsed === 'object') {
      return {
        mode: parsed.mode === 'floating' ? 'floating' : 'docked',
        dockedWidth: typeof parsed.dockedWidth === 'number' ? parsed.dockedWidth : DEFAULT_DOCKED_WIDTH,
        floating: {
          x: parsed.floating?.x ?? DEFAULT_FLOATING.x,
          y: parsed.floating?.y ?? DEFAULT_FLOATING.y,
          width: parsed.floating?.width ?? DEFAULT_FLOATING.width,
          height: parsed.floating?.height ?? DEFAULT_FLOATING.height,
        },
      };
    }
    return {
      mode: 'docked',
      dockedWidth: DEFAULT_DOCKED_WIDTH,
      floating: { ...DEFAULT_FLOATING },
    };
  }

  function persist() {
    quietSet(STORAGE_KEY, JSON.stringify({ mode, dockedWidth, floating }));
  }

  const initial = loadState();
  let mode: Mode = $state(initial.mode);
  let dockedWidth: number = $state(Math.max(MIN_WIDTH, initial.dockedWidth));
  let floating = $state({ ...initial.floating });

  // Collapsed-pill size; slight overshoot is fine (overflow:hidden).
  const COLLAPSED_WIDTH = 200;
  const COLLAPSED_HEIGHT = 44;

  // Fade for open-only buttons (bar timing lives in CSS vars below).
  const BTN_FADE = { duration: 130, easing: cubicInOut };

  // Suppress CSS transitions during gestures + mode swaps.
  let suppressTransition = $state(false);

  // Scrim catches pointer events during gestures so they hit the panel, not the iframe.
  let gesturing: 'drag' | 'resize-left' | 'resize-se' | null = $state(null);

  function startDrag(e: PointerEvent) {
    if (!open || mode !== 'floating') return;
    if ((e.target as HTMLElement).closest('button')) return;
    gesturing = 'drag';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = floating.x;
    const origY = floating.y;
    function move(ev: PointerEvent) {
      floating = {
        ...floating,
        x: clamp(origX + (ev.clientX - startX), 0, window.innerWidth - 120),
        y: clamp(origY + (ev.clientY - startY), 0, window.innerHeight - 40),
      };
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function startDockedResize(e: PointerEvent) {
    if (!open || mode !== 'docked') return;
    gesturing = 'resize-left';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const origWidth = dockedWidth;
    function move(ev: PointerEvent) {
      // Panel anchored right — drag left grows width.
      dockedWidth = clamp(origWidth + (startX - ev.clientX), MIN_WIDTH, window.innerWidth - 120);
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function startFloatingResize(e: PointerEvent) {
    if (!open || mode !== 'floating') return;
    gesturing = 'resize-se';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = floating.width;
    const origH = floating.height;
    function move(ev: PointerEvent) {
      floating = {
        ...floating,
        width: clamp(origW + (ev.clientX - startX), MIN_WIDTH, window.innerWidth - floating.x - 8),
        height: clamp(origH + (ev.clientY - startY), MIN_HEIGHT, window.innerHeight - floating.y - 8),
      };
    }
    function up() {
      gesturing = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persist();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  function toggleMode() {
    suppressTransition = true;
    mode = mode === 'docked' ? 'floating' : 'docked';
    // Re-clamp floating rect into viewport in case it drifted off-screen.
    if (mode === 'floating') {
      floating = {
        x: clamp(floating.x, 0, window.innerWidth - MIN_WIDTH),
        y: clamp(floating.y, 0, window.innerHeight - 40),
        width: clamp(floating.width, MIN_WIDTH, window.innerWidth),
        height: clamp(floating.height, MIN_HEIGHT, window.innerHeight),
      };
    }
    persist();
    requestAnimationFrame(() => requestAnimationFrame(() => { suppressTransition = false; }));
  }

  function toggleOpen() {
    open = !open;
  }

  function handleHeaderDblClick(e: MouseEvent) {
    // Skip dblclick on buttons so their handlers don't double-fire.
    if ((e.target as HTMLElement).closest('button')) return;
    toggleOpen();
  }

  function handleToggleRequest() {
    open = !open;
  }

  onMount(() => {
    window.addEventListener('lt-overlay-toggle', handleToggleRequest);
  });
  onDestroy(() => {
    window.removeEventListener('lt-overlay-toggle', handleToggleRequest);
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--lt-overlay-scroll-pad');
    }
  });

  let panelStyle = $derived(!open
    ? `position: fixed; top: 12px; right: 12px; width: ${COLLAPSED_WIDTH}px; height: ${COLLAPSED_HEIGHT}px;`
    : mode === 'docked'
      ? `position: fixed; top: 0; right: 0; width: ${dockedWidth}px; height: 100vh;`
      : `position: fixed; top: ${floating.y}px; left: ${floating.x}px; width: ${floating.width}px; height: ${floating.height}px;`);
</script>

{#if enabled && !onEditorPath}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="lt-overlay"
  style={panelStyle}
  class:shown={open}
  class:hidden={!open}
  class:docked={open && mode === 'docked'}
  class:floating={open && mode === 'floating'}
  class:no-transition={!!gesturing || suppressTransition}
>
  <div
    class="header"
    onpointerdown={startDrag}
    ondblclick={handleHeaderDblClick}
    title={open ? 'Double-click to hide' : 'Double-click to show'}
  >
    <button
      class="hdr-btn text title"
      onclick={toggleOpen}
      title={open ? 'Hide Editor' : 'Show Editor'}
    >
      <i class="fas {open ? 'fa-chevron-right' : 'fa-chevron-left'}"></i>
      <span>Editor</span>
    </button>

    <button
      class="hdr-btn icon"
      class:active={$columnsVisible}
      onclick={toggleColumns}
      title="{$columnsVisible ? 'Hide' : 'Show'} columns"
    >
      <i class="fas fa-grip-lines-vertical"></i>
    </button>

    {#if open}
      <button
        class="hdr-btn icon"
        title={mode === 'docked' ? 'Float' : 'Dock to right'}
        onclick={toggleMode}
        transition:fade={BTN_FADE}
      >
        <i class={mode === 'docked' ? 'fas fa-up-right-from-square' : 'fas fa-thumbtack'}></i>
      </button>
    {/if}

    {#if APP_VERSION}
      <span class="version" title="live-tokens version">v{APP_VERSION}</span>
    {/if}

    {#if open}
      <div class="spacer" transition:fade={BTN_FADE}></div>
    {/if}

    {#if open && showSource}
      <span class="source-pill" transition:fade={BTN_FADE}>
        <UIPillButton
          icon="fa-code"
          href="vscode://file/{projectRoot}/{sourceFile}"
          title="Open {sourceFile} in VS Code"
        >Show page source</UIPillButton>
      </span>
    {/if}

    {#if open && navLinks.length > 0}
      <div class="seg-group" transition:fade={BTN_FADE}>
        <span class="seg-label">Active Page:</span>
        <div class="seg-bar" role="tablist" aria-label="Underlying page">
          {#each navLinks as link (link.path)}
            <button
              type="button"
              role="tab"
              class="seg-pill"
              class:active={$route === link.path}
              aria-selected={$route === link.path}
              disabled={link.disabled}
              onclick={() => navigate(link.path)}
            >
              {#if link.icon}<i class="fas {link.icon}"></i>{/if}
              <span>{link.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if hasBeenOpen}
    <div class="frame-wrap">
      <iframe
        src={editorPath}
        title="Token editor"
        class="editor-frame"
        bind:this={editorFrame}
        onload={() => postParentRoute(editorFrame?.contentWindow, $route)}
      ></iframe>
      {#if gesturing}
        <div class="gesture-scrim"></div>
      {/if}
    </div>

    {#if mode === 'docked'}
      <div class="resize-left" onpointerdown={startDockedResize}></div>
    {:else}
      <div class="resize-se" onpointerdown={startFloatingResize}></div>
    {/if}
  {/if}
</div>
{/if}

<style>
  .lt-overlay {
    /* Animation knobs: bar = panel grow/shrink. */
    --bar-open-dur: 240ms;
    --bar-open-ease: cubic-bezier(0.65, 0, 0.35, 1);
    --bar-open-delay: 0ms;
    --bar-close-dur: 240ms;
    --bar-close-ease: cubic-bezier(0.65, 0, 0.35, 1);
    --bar-close-delay: 70ms;

    display: flex;
    flex-direction: column;
    background: var(--ui-surface-lower, #0a0a0a);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6);
    z-index: 2000;
    overflow: hidden;
    font-family: var(--ui-font-sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif);
    color: var(--ui-text-primary, #fff);
    transition:
      width var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      height var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      top var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      right var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay),
      border-radius var(--bar-open-dur) var(--bar-open-ease) var(--bar-open-delay);
  }

  .lt-overlay.docked {
    border-right: none;
    border-radius: 0;
  }

  .lt-overlay.floating {
    border-radius: var(--ui-radius-xl, 8px);
  }

  /* Collapsed state: pinned top-right; iframe stays mounted, clipped by overflow:hidden. */
  .lt-overlay.hidden {
    border-radius: var(--ui-radius-lg, 6px);
    transition:
      width var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      height var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      top var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      right var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay),
      border-radius var(--bar-close-dur) var(--bar-close-ease) var(--bar-close-delay);
  }

  .lt-overlay.hidden .resize-left,
  .lt-overlay.hidden .resize-se {
    display: none;
  }

  .lt-overlay.no-transition,
  .lt-overlay.no-transition .frame-wrap {
    transition: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6, 6px);
    padding: var(--ui-space-6, 6px) var(--ui-space-10, 10px);
    background: var(--ui-surface-low, #111);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: default;
    flex-shrink: 0;
    user-select: none;
  }

  .lt-overlay.hidden .header {
    border-bottom: none;
    padding: 5px var(--ui-space-8, 8px);
  }

  .lt-overlay.floating .header {
    cursor: move;
  }

  .hdr-btn.title {
    gap: 7px;
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-semibold, 600);
    color: rgba(255, 255, 255, 0.85);
  }

  .spacer { flex: 1; }

  .version {
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
    color: rgba(255, 255, 255, 0.4);
    margin-left: var(--ui-space-2, 2px);
    user-select: none;
  }

  .hdr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--ui-radius-md, 4px);
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: background var(--ui-transition-fast, 120ms ease), color var(--ui-transition-fast, 120ms ease);
    font-family: inherit;
  }

  .hdr-btn.icon {
    padding: var(--ui-space-6, 6px);
    aspect-ratio: 1;
    font-size: var(--ui-font-size-md, 16px);
  }

  .hdr-btn.text {
    padding: var(--ui-space-6, 6px) var(--ui-space-10, 10px);
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
  }

  .source-pill {
    display: inline-flex;
  }

  .hdr-btn.nav {
    padding: var(--ui-space-6, 6px) var(--ui-space-8, 8px);
    gap: var(--ui-space-4, 4px);
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
  }

  .hdr-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--ui-text-primary, #fff);
  }

  .hdr-btn.active {
    background: rgba(255, 255, 255, 0.12);
    color: var(--ui-text-primary, #fff);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .seg-group {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8, 8px);
    margin-left: 18px;
    margin-right: var(--ui-space-4, 4px);
  }

  .seg-label {
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-semibold, 600);
    color: var(--ui-text-primary, #fff);
  }

  .seg-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4, 4px);
    padding: 3px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--ui-radius-lg, 6px);
    box-shadow:
      inset 0 1px 0 rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(0, 0, 0, 0.4);
  }

  .seg-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4, 4px);
    padding: var(--ui-space-4, 4px) var(--ui-space-8, 8px);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.6);
    font-family: inherit;
    font-size: var(--ui-font-size-md, 16px);
    font-weight: var(--ui-font-weight-medium, 500);
    cursor: pointer;
    transition:
      background var(--ui-transition-fast, 120ms ease),
      color var(--ui-transition-fast, 120ms ease),
      border-color var(--ui-transition-fast, 120ms ease);
  }

  .seg-pill i {
    font-size: var(--ui-font-size-md, 16px);
    opacity: 0.85;
  }

  .seg-pill:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.9);
  }

  .seg-pill:disabled {
    color: rgba(255, 255, 255, 0.28);
    cursor: not-allowed;
  }

  .seg-pill:disabled i {
    opacity: 0.5;
  }

  /* Outlined (not filled) so this reads as sibling to iframe's switcher, not a twin. */
  .seg-pill.active {
    color: var(--ui-text-primary, #fff);
    border-color: rgba(255, 255, 255, 0.5);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.25) 100%);
  }

  .frame-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #000;
  }

  .lt-overlay.hidden .frame-wrap {
    pointer-events: none;
  }

  .editor-frame {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  .gesture-scrim {
    position: absolute;
    inset: 0;
    background: transparent;
    cursor: inherit;
  }

  .resize-left {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    background: transparent;
  }

  .resize-left:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .resize-se {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(
      135deg,
      transparent 45%,
      rgba(255, 255, 255, 0.35) 45%,
      rgba(255, 255, 255, 0.35) 55%,
      transparent 55%
    );
  }
</style>
