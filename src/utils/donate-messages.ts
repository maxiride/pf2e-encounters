// Loot/treasure-themed rotating donation prompt messages. {difficulty} / {creatureCount}
// are filled in from the current encounter summary at trigger time.

export interface DonateMessageContext {
  difficulty?: string;
  creatureCount?: number;
}

const TEMPLATES_WITH_CONTEXT = [
  "That's {article} {difficulty} encounter with {creatureCount} {creatureWord}, balanced without breaking a sweat. If the loot's good, toss a coin in the tip jar 🪙",
  '{creatureCount} {creatureWord}, {difficulty} difficulty, zero math for you. Fair trade for a coffee?',
  "Encounter secured: {difficulty}, {creatureCount} {foeWord}. The real treasure is the prep time you just saved — the tip jar's right here if you want to repay the favor.",
  '{Article} {difficulty} party of {creatureCount} awaits your players. If this tool has been good loot for your table, a coin in the jar keeps it running.',
  "You've assembled {article} {difficulty} threat with {creatureCount} {creatureWord}. No trap involved — just an optional tip jar 🪙",
  "{creatureCount}-strong, {difficulty} rated, ready to ambush your party. If this saved you a headache, the tip jar's a few clicks away.",
];

const TEMPLATES_NO_CONTEXT = [
  "Encounter balanced, math handled — no need to roll for it. If this tool's earning its keep at your table, toss a coin in the tip jar 🪙",
  "No XP for me, but coffee works too. Tip jar's here if this tool's been a good NPC in your prep.",
];

const LAST_INDEX_KEY = 'pf2e-encounters:donate-message-last-index';

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function interpolate(template: string, context: DonateMessageContext): string {
  const difficulty = context.difficulty ?? '';
  const singular = context.creatureCount === 1;
  const lowerArticle = article(difficulty);

  return template
    .replace('{difficulty}', difficulty)
    .replace('{creatureCount}', String(context.creatureCount ?? ''))
    .replace('{creatureWord}', singular ? 'creature' : 'creatures')
    .replace('{foeWord}', singular ? 'foe' : 'foes')
    .replace('{article}', lowerArticle)
    .replace('{Article}', lowerArticle.charAt(0).toUpperCase() + lowerArticle.slice(1));
}

// pickDonateMessage picks a message, avoiding an immediate repeat of the last one shown.
export function pickDonateMessage(context: DonateMessageContext = {}): string {
  const hasContext = context.difficulty != null && context.creatureCount != null;
  const pool = hasContext ? TEMPLATES_WITH_CONTEXT : TEMPLATES_NO_CONTEXT;

  const lastIndex = Number(localStorage.getItem(LAST_INDEX_KEY) ?? -1);
  let index = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && index === lastIndex) {
    index = (index + 1) % pool.length;
  }
  localStorage.setItem(LAST_INDEX_KEY, String(index));

  const template = pool[index] ?? pool[0] ?? '';
  return hasContext ? interpolate(template, context) : template;
}
