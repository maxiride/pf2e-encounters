import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// Smoke suite: covers the critical user paths (browse -> filter -> add ->
// balance) against real AoN data served by the dev server. Assertions avoid
// exact dataset counts where possible — the data refreshes monthly — and pin
// only stable, iconic creatures (Goblin Warrior lvl -1, Ogre Warrior lvl 3,
// Ancient Red Dragon lvl 19).

function encounterPanel(page: Page): Locator {
  return page.locator('.q-card').filter({ has: page.getByText('Encounter', { exact: true }) });
}

// q-table's virtual-scroll renders the real data rows inside a dedicated
// `.q-virtual-scroll__content` tbody, sandwiched between "before"/"after"
// padding tbodies (each holding a single zero-height spacer <tr> at rest).
// A bare `tbody tr` locator matches those spacer rows too, and `.first()`
// always lands on the "before" spacer -- so scope to the content tbody.
function contentRows(page: Page): Locator {
  return page.locator('tbody.q-virtual-scroll__content tr');
}

async function searchAndAddFirst(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder(/search by name/i).fill(name);
  const firstLink = page.locator('tbody .creature-link').first();
  await expect(firstLink).toContainText(new RegExp(name, 'i'));
  await contentRows(page).first().getByRole('button').click();
}

test.beforeEach(async ({ page }) => {
  // skip the one-time "what's new" dialog (src/layouts/MainLayout.vue) -- it's
  // gated on localStorage and would otherwise pop up and block every test's
  // first interaction, since each test starts with a fresh browser context
  await page.addInitScript(() => localStorage.setItem('pf2e-encounters:seen-release:v2', '1'));
  await page.goto('/');
  // creature database loaded and rendered
  await expect(contentRows(page)).not.toHaveCount(0, { timeout: 30_000 });
});

test('loads the creature database', async ({ page }) => {
  await expect(contentRows(page).first()).toBeVisible();
  // total in the thousands -> both monsters and NPCs made it in
  await expect(page.getByText(/\d{4} creatures/)).toBeVisible();
});

test('filters by name', async ({ page }) => {
  await page.getByPlaceholder(/search by name/i).fill('goblin warrior');
  const links = page.locator('tbody .creature-link');
  await expect(links.first()).toContainText(/goblin warrior/i);
  for (const text of await links.allTextContents()) {
    expect(text).toMatch(/goblin warrior/i);
  }
});

test('filters by creature type', async ({ page }) => {
  await page.getByRole('button', { name: 'NPCs' }).click();
  await expect(page.locator('tbody .badge-outline').filter({ hasText: 'NPC' }).first()).toBeVisible();
  await expect(page.locator('tbody .badge-outline').filter({ hasText: 'Monster' })).toHaveCount(0);
});

test('adds a creature and prices it per the rulebook table', async ({ page }) => {
  await searchAndAddFirst(page, 'goblin warrior');

  const panel = encounterPanel(page);
  await expect(panel.getByText(/goblin warrior/i)).toBeVisible();
  // level -1 creature vs default party level 1 -> delta -2 -> 20 XP
  await expect(panel.getByText('Level -1 · 20 XP')).toBeVisible();
  await expect(panel.locator('.q-badge')).toHaveText('Trivial');

  await panel.getByRole('button', { name: 'Elite' }).click();
  // elite on a level -1 creature raises it by 2 (GM Core exception) -> delta 0 -> 40 XP
  await expect(panel.getByText('Level 1 · 40 XP')).toBeVisible();
});

test('weak and elite variants adjust level and XP', async ({ page }) => {
  await searchAndAddFirst(page, 'ogre warrior');
  const panel = encounterPanel(page);
  // level 3 vs party level 1 -> delta +2 -> 80 XP
  await expect(panel.getByText('Level 3 · 80 XP')).toBeVisible();
  await expect(panel.locator('.q-badge')).toHaveText('Moderate');

  await panel.getByRole('button', { name: 'Elite' }).click();
  // elite: level 3 -> 4, delta +3 -> 120 XP
  await expect(panel.getByText('Level 4 · 120 XP')).toBeVisible();
  await expect(panel.locator('.q-badge')).toHaveText('Severe');

  await panel.getByRole('button', { name: 'Weak' }).click();
  // weak: level 3 -> 2, delta +1 -> 60 XP
  await expect(panel.getByText('Level 2 · 60 XP')).toBeVisible();
  await expect(panel.locator('.q-badge')).toHaveText('Low');
});

test('XP recomputes when party level changes (regression, issue #17)', async ({ page }) => {
  await searchAndAddFirst(page, 'ogre warrior');
  const panel = encounterPanel(page);
  // level 3 vs party level 1 -> delta +2 -> 80 XP
  await expect(panel.getByText('Level 3 · 80 XP')).toBeVisible();

  await panel.getByLabel('Party level').fill('5');
  // delta -2 -> 20 XP
  await expect(panel.getByText('Level 3 · 20 XP')).toBeVisible();
});

test('warns when a creature is beyond the ±4 level range (issue #62)', async ({ page }) => {
  await searchAndAddFirst(page, 'ancient red dragon');
  const panel = encounterPanel(page);
  // level 19 vs party level 1 -> way out of the rulebook table
  await expect(panel.locator('.q-icon').filter({ hasText: 'warning' })).toBeVisible();
});

test('threat bar shows the scaled budget thresholds', async ({ page }) => {
  // defaults: party of 4 -> GM Core base budgets
  await expect(page.getByText('Trivial 40')).toBeVisible();
  await expect(page.getByText('Extreme 160')).toBeVisible();

  // party of 5 -> +10/+40 character adjustment
  await encounterPanel(page).getByLabel('Party size').fill('5');
  await expect(page.getByText('Trivial 50')).toBeVisible();
  await expect(page.getByText('Extreme 200')).toBeVisible();
});
