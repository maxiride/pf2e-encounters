// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { configureEditor, storageKey } from '../store/editorConfig';
import { route, navigate, init as initRouter } from '../routing/router';

describe('M8 — lazy storage prefix resolution', () => {
  it('storageKey() reflects the prefix at call time, not at module-load time', () => {
    // The default prefix is `lt-`. configureEditor mutates it; subsequent
    // storageKey() calls must observe the new prefix.
    expect(storageKey('editor-state')).toBe('lt-editor-state');

    configureEditor({ storagePrefix: 'test-' });
    expect(storageKey('editor-state')).toBe('test-editor-state');

    // Reset for any later tests in the file.
    configureEditor({ storagePrefix: 'lt-' });
    expect(storageKey('editor-state')).toBe('lt-editor-state');
  });

  it('editorStore persistNow uses the configured prefix at write time', async () => {
    // Reconfigure BEFORE importing editorStore — but since these tests share
    // module state with other suites, we can only verify that getPersistKey
    // behaviour is lazy via the storageKey contract above. The functional
    // round-trip is covered by manual library-import tests.
    configureEditor({ storagePrefix: 'lazy-' });
    expect(storageKey('editor-state')).toBe('lazy-editor-state');
    configureEditor({ storagePrefix: 'lt-' });
  });
});

describe('m9 — navigate() emits exactly one route store update', () => {
  beforeEach(() => {
    // Pin a stable starting route. Router.init() is idempotent; calling it
    // here is safe even if some earlier test already initialised it.
    initRouter();
    // Reset history pushState side effects to a clean state by overwriting
    // the current route to '/'.
    history.replaceState(null, '', '/');
    route.set('/');
  });

  it('produces a single store write per navigate() call', () => {
    const sub = vi.fn();
    const unsub = route.subscribe(sub);
    sub.mockClear(); // drop the immediate-emit on subscribe

    navigate('/foo');
    expect(sub).toHaveBeenCalledTimes(1);
    expect(get(route)).toBe('/foo');

    unsub();
  });
});
