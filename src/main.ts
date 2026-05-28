import '@fortawesome/fontawesome-free/css/all.min.css';
import '@motion-proto/live-tokens/app/tokens.css';
// Editor-owned sidecar with production-theme + component-alias overrides.
// Loaded AFTER tokens.css so its `:root:root` selectors (specificity 0,0,2)
// win over the developer-authored defaults (0,0,1).
import '../live-tokens-data/tokens.generated.css';
import '@motion-proto/live-tokens/app/fonts.css';
import {
  initializeTheme,
  initCssVarSync,
  initColumnsOverlay,
  initRouter,
  initEditorStore,
  registerComponent,
} from '@motion-proto/live-tokens';
import SelectBadgeEditor, { allTokens as selectBadgeTokens } from './system/components/SelectBadgeEditor.svelte';
import App from './App.svelte';
import { mount } from 'svelte';

registerComponent({
  id: 'selectbadge',
  label: 'Select Badge',
  icon: 'fas fa-tag',
  sourceFile: 'src/system/components/SelectBadge.svelte',
  editorComponent: SelectBadgeEditor,
  schema: selectBadgeTokens,
});

async function boot() {
  initCssVarSync();
  initRouter();
  initColumnsOverlay();
  initEditorStore();

  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  mount(App, { target: document.getElementById('app')! });
}

boot();
