<template>
  <q-card flat bordered class="column no-wrap">
    <!-- Header -->
    <q-card-section class="row items-center q-py-sm">
      <div class="text-subtitle1 text-weight-medium">Encounter</div>
      <q-space />
      <q-btn
        v-if="encounterCreatures.length"
        flat
        dense
        round
        icon="delete_sweep"
        color="negative"
        @click="encounterStore.$reset()"
      >
        <q-tooltip>Clear encounter</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator />

    <!-- Party settings -->
    <q-card-section class="row q-col-gutter-sm q-py-sm">
      <div class="col-6">
        <q-input
          :model-value="partyLevel"
          type="number"
          label="Party level"
          outlined
          dense
          :min="1"
          :max="20"
          @update:model-value="(v) => encounterStore.setPartyLevel(Number(v))"
        />
      </div>
      <div class="col-6">
        <q-input
          :model-value="partySize"
          type="number"
          label="Party size"
          outlined
          dense
          :min="1"
          @update:model-value="(v) => encounterStore.setPartySize(Number(v))"
        />
      </div>
      <div class="col-12">
        <Transition name="degenerate-warn">
          <div v-if="hasDegenerateBudget" class="degenerate-banner" role="status">
            <q-icon name="warning" size="18px" />
            <div class="text-body2">
              At this party size, one or more difficulty bands overlap or invert per the rulebook's math (GM Core
              Encounter Budget table) — a known rules-as-written gap for small parties, not a bug in this tool. Use GM
              judgment.
              <div class="q-mt-xs">
                <a href="https://2e.aonprd.com/Rules.aspx?ID=2717" target="_blank" rel="noopener">Rulebook</a>
                ·
                <a href="https://github.com/maxiride/pf2e-encounters/issues/81" target="_blank" rel="noopener"
                  >Issue #81</a
                >
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </q-card-section>

    <q-separator />

    <!-- Creature list -->
    <q-card-section v-if="encounterCreatures.length === 0" class="text-grey-6 text-center q-py-lg col">
      <q-icon name="swords" size="32px" class="q-mb-sm" style="display: block; margin-inline: auto" />
      Double-click a creature in the table<br />or use its <q-icon name="add" size="14px" /> button to add it.
    </q-card-section>

    <q-list v-else separator class="col scroll">
      <q-item v-for="(creature, index) in encounterCreatures" :key="index" class="q-py-sm">
        <q-item-section>
          <q-item-label>
            <a
              v-if="creature.url"
              :href="`https://2e.aonprd.com${creature.url}`"
              target="_blank"
              rel="noopener"
              class="creature-link"
              >{{ creature.name }}</a
            >
            <template v-else>{{ creature.name }}</template>
          </q-item-label>
          <q-item-label caption>
            Level {{ adjustedLevel(creature) }} · {{ costOf(creature) }} XP
            <template v-if="creature.count > 1"> each · {{ costOf(creature) * creature.count }} XP total</template>
            <q-icon v-if="outOfBounds(creature)" name="warning" color="warning" size="16px" class="q-ml-xs">
              <q-tooltip
                >More than 4 levels from the party — cost is capped at the table's edge value and doesn't reflect the
                true difficulty of this fight.</q-tooltip
              >
            </q-icon>
          </q-item-label>
          <div class="row items-center q-gutter-xs q-mt-xs">
            <q-btn-toggle
              :model-value="creature.kind"
              dense
              no-caps
              unelevated
              size="sm"
              toggle-color="primary"
              :options="[
                { label: 'Weak', value: 'weak' },
                { label: 'Base', value: 'base' },
                { label: 'Elite', value: 'elite' },
              ]"
              class="kind-toggle"
              @update:model-value="(kind) => setKind(index, kind)"
            />
          </div>
        </q-item-section>

        <q-item-section side>
          <div class="row items-center no-wrap q-gutter-xs">
            <q-btn
              icon="remove"
              size="sm"
              flat
              round
              dense
              :disable="creature.count <= 1"
              @click="encounterStore.decrementCreatureCount(index)"
            />
            <div class="text-body2 text-center" style="min-width: 1.5em">{{ creature.count }}</div>
            <q-btn icon="add" size="sm" flat round dense @click="encounterStore.incrementCreatureCount(index)" />
            <q-btn
              icon="close"
              size="sm"
              flat
              round
              dense
              color="negative"
              class="q-ml-sm"
              @click="encounterStore.removeCreature(index)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <q-separator />

    <!-- Totals -->
    <q-card-section class="row items-center q-py-sm">
      <q-badge :color="threatColor" :label="threat" class="q-py-xs q-px-sm text-weight-medium" />
      <q-space />
      <div class="text-subtitle2">
        {{ xpCost }} XP to award
        <q-tooltip
          >Always the 4-character table value — the rules keep XP awards fixed regardless of party size (only
          the threat budget scales).</q-tooltip
        >
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { adjustedLevel, computeCreatureCost, isDeltaOutOfBounds, useEncounterStore } from 'stores/encounter-store';
import type { Creature } from 'stores/encounter-store';
import { THREAT_COLORS } from 'components/threat-colors';

const encounterStore = useEncounterStore();
const { encounterCreatures, partyLevel, partySize, xpCost, threat, hasDegenerateBudget } =
  storeToRefs(encounterStore);

function costOf(creature: Creature): number {
  return computeCreatureCost(creature, partyLevel.value);
}

function outOfBounds(creature: Creature): boolean {
  return isDeltaOutOfBounds(creature, partyLevel.value);
}

function setKind(index: number, kind: Creature['kind']) {
  if (kind === 'weak') encounterStore.makeCreatureWeak(index);
  else if (kind === 'elite') encounterStore.makeCreatureElite(index);
  else encounterStore.makeCreatureBase(index);
}

const threatColor = computed(() => THREAT_COLORS[threat.value] ?? 'grey-6');
</script>

<style lang="scss" scoped>
.creature-link {
  color: $primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.kind-toggle {
  border: 1px solid $separator-color;
  border-radius: 4px;
}

.degenerate-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  background: rgba($warning, 0.14);
  border: 1px solid rgba($warning, 0.5);
  color: darken($warning, 30%);

  .q-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  a {
    color: inherit;
    text-decoration: underline;

    &:hover {
      text-decoration: none;
    }
  }
}

.degenerate-warn-enter-active,
.degenerate-warn-leave-active {
  transition:
    opacity 220ms cubic-bezier(0, 0, 0.2, 1),
    transform 220ms cubic-bezier(0, 0, 0.2, 1);
}

.degenerate-warn-enter-from,
.degenerate-warn-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .degenerate-warn-enter-active,
  .degenerate-warn-leave-active {
    transition: none;
  }
}
</style>
