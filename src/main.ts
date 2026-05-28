import '@motion-proto/live-tokens/app/tokens.css';
import './live-tokens/data/tokens.generated.css';
import '@motion-proto/live-tokens/app/fonts.css';
import { bootLiveTokens } from '@motion-proto/live-tokens';
import App from './App.svelte';
import SelectBadgeEditor, { allTokens as selectBadgeTokens } from './components/SelectBadge.editor.svelte';

bootLiveTokens(App, '#app', {
  components: [
    {
      id: 'selectbadge',
      label: 'Select Badge',
      icon: 'fas fa-tag',
      sourceFile: 'src/components/SelectBadge.svelte',
      editorComponent: SelectBadgeEditor,
      schema: selectBadgeTokens,
    },
  ],
});
