<script lang="ts">
  import { LiveEditorOverlay, ColumnsOverlay, route, navigate } from '@motion-proto/live-tokens';

  const allNavLinks = [
    { path: '/', label: 'Site', icon: 'fa-home' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ];

  let visibleNavLinks = $derived(allNavLinks);

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
  let isComponentEditor = $derived(isDev && $route === '/components');

  // Pages are loaded dynamically so each route's module, and any CSS it
  // side-effect-imports, only evaluates when that route is actually visited.
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('@motion-proto/live-tokens/editor');
    if (isComponentEditor) return import('@motion-proto/live-tokens/component-editor-page');
    return import('./Home.svelte');
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
<div class="lt-app" class:is-editor={isEditor} class:is-component-editor={isComponentEditor} onclick={handleClick}>
  <LiveEditorOverlay
    navLinks={visibleNavLinks}
    pageSources={{ '/': 'src/Home.svelte' }}
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
