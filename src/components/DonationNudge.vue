<template>
  <transition name="donation-nudge-fade">
    <div v-if="visible" class="donation-nudge" role="note">
      <button
        type="button"
        class="donation-nudge__close"
        aria-label="Dismiss"
        @click="dismiss"
      >
        ×
      </button>
      <p>{{ message }}</p>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useEncounterStore } from 'stores/encounter-store';
import { pickDonateMessage } from 'src/utils/donate-messages';

// Shown at most once every 30 days, riding the same "GM went idle after
// building something" signal the encounter-snapshot analytics event already
// uses (8s of inactivity, or an immediate flush on tab-hide/pagehide) —
// rather than popping on the very first creature added, which fires before
// there's anything worth calling an encounter.
const SHOWN_AT_KEY = 'pf2e-encounters:donation-nudge-shown-at';
const REPEAT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1500;
const AUTO_HIDE_MS = 12000;

const encounterStore = useEncounterStore();
const visible = ref(false);
const message = ref('');
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let showTimer: ReturnType<typeof setTimeout> | undefined;

function dismiss(): void {
  visible.value = false;
  clearTimeout(hideTimer);
}

function eligibleToShow(): boolean {
  const lastShown = Number(localStorage.getItem(SHOWN_AT_KEY));
  return !lastShown || Date.now() - lastShown > REPEAT_INTERVAL_MS;
}

function show(snapshot: { threat: string; creatureCount: number }): void {
  message.value = pickDonateMessage({ difficulty: snapshot.threat, creatureCount: snapshot.creatureCount });

  localStorage.setItem(SHOWN_AT_KEY, String(Date.now()));
  visible.value = true;
  hideTimer = setTimeout(dismiss, AUTO_HIDE_MS);
}

const stopWatch = watch(
  () => encounterStore.lastSnapshot,
  (snapshot) => {
    // Tab is backgrounded or closing — nobody would see it, so leave the
    // watcher live for the next real idle snapshot instead of consuming it.
    if (!snapshot || document.hidden || !eligibleToShow()) return;
    showTimer = setTimeout(() => show(snapshot), SHOW_DELAY_MS);
    stopWatch();
  },
);

onBeforeUnmount(() => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
});
</script>

<style scoped>
.donation-nudge {
  position: fixed;
  right: 20px;
  bottom: 92px;
  z-index: 9999;
  max-width: 220px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.24);
  border-radius: 10px;
  padding: 10px 26px 10px 12px;
}

.donation-nudge::before,
.donation-nudge::after {
  content: '';
  position: absolute;
  bottom: -9px;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
}

.donation-nudge::before {
  right: 20px;
  border-top: 9px solid rgba(0, 0, 0, 0.24);
}

.donation-nudge::after {
  right: 22px;
  bottom: -7px;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 7px solid #fff;
}

.donation-nudge p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
}

.donation-nudge__close {
  position: absolute;
  top: 2px;
  right: 6px;
  border: none;
  background: transparent;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  padding: 2px;
  font-size: 0.75rem;
}

.donation-nudge-fade-enter-active,
.donation-nudge-fade-leave-active {
  transition: opacity 0.25s ease;
}
.donation-nudge-fade-enter-from,
.donation-nudge-fade-leave-to {
  opacity: 0;
}
</style>
