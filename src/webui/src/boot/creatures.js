import { defineBoot } from '#q-app/wrappers'
import { useCreaturesStore } from 'stores/creatures-store.js'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(async ({ store }) => {
  const creaturesStore = useCreaturesStore(store)
  await creaturesStore.fetchCreatures()
})
