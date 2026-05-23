// Dev server boot. Editor pages script-import their own chrome CSS
// (ui-editor.css, ui-form-controls.css, fontawesome). What's left here is what
// the non-editor surfaces (LiveEditorOverlay on every route, Home/Demo) need:
// FA icons for the overlay, theme tokens, and starter fonts.
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../system/styles/tokens.css';
// Editor-owned sidecar with production-theme + component-alias overrides.
// Loaded AFTER tokens.css so its `:root:root` selectors (specificity 0,0,2)
// win over the developer-authored defaults (0,0,1).
import '../system/styles/tokens.generated.css';
import '../system/styles/fonts.css';
import { initializeTheme } from '../editor/core/themes/themeInit';
import * as cssVarSync from '../editor/core/cssVarSync';
import * as columnsOverlay from '../editor/overlay/columnsOverlay';
import * as router from '../editor/core/routing/router';
import * as editorStore from '../editor/core/store/editorStore';
import App from './App.svelte';
import { mount } from "svelte";

/**
 * Single boot orchestration point — call each module's idempotent `init()`
 * once. Module-load side effects (DOM reads, storage subscriptions, eager
 * hydrate) used to spread across these files; now they only fire when the
 * host explicitly opts in via `boot()`. Library consumers that want
 * different ordering can replicate this orchestration with a custom prefix
 * via `configureEditor` before calling the inits.
 */
async function boot() {
  cssVarSync.init();
  router.init();
  columnsOverlay.init();
  editorStore.init();

  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  mount(App, { target: document.getElementById('app')! });
}

boot();
