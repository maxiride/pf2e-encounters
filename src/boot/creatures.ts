import { defineBoot } from '#q-app/wrappers';
import { useCreaturesStore } from 'stores/creatures-store';

// Kick off the creatures download without blocking app startup;
// the UI shows a loading overlay while isLoading is true.
export default defineBoot(({ store }) => {
  void useCreaturesStore(store).fetchCreatures();
});
