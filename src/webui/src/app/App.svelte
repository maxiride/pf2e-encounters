<script lang="ts">
  import { run } from 'svelte/legacy';

  import LiveEditorOverlay from '../editor/overlay/LiveEditorOverlay.svelte';
  import ColumnsOverlay from '../editor/overlay/ColumnsOverlay.svelte';
  import { route, navigate } from '../editor/core/routing/router';
  import { editorView } from '../editor/core/store/editorViewStore';

  const allNavLinks = [
    { path: '/', label: 'Site', icon: 'fa-home' },
    { path: '/demo', label: 'Demo', icon: 'fa-box-open' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ];

  let visibleNavLinks = $derived(allNavLinks);

  // The /components page and the overlay's components view are the same surface.
  // Keep them mutually exclusive by flipping the overlay to tokens whenever the
  // underlying page is /components, so they pair as page+overlay instead of
  // stacking on top of each other.
  run(() => {
    if ($route === '/components' && $editorView === 'components') {
      editorView.set('tokens');
    }
  });

  function handleClick(e: MouseEvent) {
    const anchor = (e.target as HTMLElement).closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  }

  const isDev = import.meta.env.DEV;
  let isEditor = $derived(isDev && $route === '/editor');
  let isDemo = $derived(isDev && $route === '/demo');
  let isComponentEditor = $derived(isDev && $route === '/components');
  // Unlisted dev-only playgrounds for component iteration. Reachable only by
  // typing the URL directly; intentionally absent from allNavLinks.
  let isFloatingTagsPlayground = $derived(isDev && $route === '/playground/floating-tags');

  // Pages are loaded dynamically so each route's module — and any CSS it
  // side-effect-imports (e.g. site.css on Home) — only evaluates when that
  // route is actually visited. Static imports at the top of this file would
  // evaluate every page module at boot, leaking site.css into editor routes.
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('../editor/pages/Editor.svelte');
    if (isDemo) return import('../demo/Demo.svelte');
    if (isComponentEditor) return import('../editor/pages/ComponentEditorPage.svelte');
    if (isFloatingTagsPlayground) return import('../demo/FloatingTagsPlayground.svelte');
    return import('./Home.svelte');
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="lt-app" class:is-editor={isEditor} class:is-component-editor={isComponentEditor} onclick={handleClick}>
  <LiveEditorOverlay
    navLinks={visibleNavLinks}
    pageSources={{
      '/': 'src/app/Home.svelte',
      '/demo': 'src/demo/Demo.svelte',
      '/components': 'src/editor/pages/ComponentEditorPage.svelte',
      '/editor': 'src/editor/pages/Editor.svelte',
      '/playground/floating-tags': 'src/demo/FloatingTagsPlayground.svelte',
    }}
    hidePageSourceOn={['/components']}
  />
  <ColumnsOverlay />

  {#await pagePromise then m}
    {@const PageComponent = m.default}
    <PageComponent />
  {/await}
</div>

<style>
  :global(html) {
    scrollbar-gutter: stable;
  }

  :global(body) {
    background: var(--page-bg);
    background-attachment: var(--page-bg-attachment, fixed);
    overflow-x: auto;
  }

  .lt-app {
    width: 100%;
    min-height: 100vh;
    color: var(--text-primary);
    padding-bottom: 12rem;
    /* Set by LiveEditorOverlay when docked-open. Extends the layout past the
       fixed-position panel so the viewport can scroll to reveal hidden content. */
    padding-right: var(--lt-overlay-scroll-pad, 0px);
  }

  .lt-app.is-editor {
    padding-bottom: 0;
    background: black;
  }

  .lt-app.is-component-editor {
    min-height: 0;
    height: 100vh;
    padding-bottom: 0;
    padding-right: 0;
    background: black;
    overflow: hidden;
  }
</style>
