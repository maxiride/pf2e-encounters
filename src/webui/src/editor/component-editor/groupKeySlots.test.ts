// @vitest-environment node
//
// Slot-collision invariant for editor schemas.
//
// A groupKey declares a sibling set: tokens that share a groupKey are linked
// peers (`getComponentPropertySiblings`, `isComponentPropertyLinked`,
// `setComponentAliasLinked`). The codebase convention (src/styles/CONVENTIONS.md)
// requires shared groupKeys to cross only a VARIANT axis — never a slot/part
// axis. Crossing slots produces "phantom siblings": the schema reports header
// and cell as linked peers, but the linked block can't surface them because
// the editor's `linkableContexts` (correctly) treats them as independent.
//
// `registerComponentSchema` already warns at runtime when a typography
// groupKey covers multiple slots (e.g. one groupKey holding both
// `--card-...-title-font-family` and `--card-...-body-font-family`). This
// test asserts the invariant instead of relying on a console warning that
// nothing fails on.
//
// Caught the TableEditor regression where `header` and `cell` typography
// shared `family`/`size`/`weight`/`height` groupKeys (and `surface`/`padding`
// shared groupKeys across header/stripe and header/cell respectively). See
// the commit that introduced this test for context.

import { describe, it, expect } from 'vitest';
import { componentRegistryEntries } from './registry';

const TYPOGRAPHY_PROP_SUFFIXES = ['font-family', 'font-size', 'font-weight', 'line-height'] as const;

/** Mirror of `typographySlotOf` in `lib/slices/components.ts`. */
function typographySlotOf(varName: string): string | null {
  for (const suffix of TYPOGRAPHY_PROP_SUFFIXES) {
    if (!varName.endsWith('-' + suffix)) continue;
    const head = varName.slice(0, -(suffix.length + 1));
    const lastDash = head.lastIndexOf('-');
    if (lastDash < 0) return null;
    return head.slice(lastDash + 1);
  }
  return null;
}

describe('editor groupKey slot invariant', () => {
  for (const entry of componentRegistryEntries) {
    it(`${entry.id}: no typography groupKey straddles multiple slots`, () => {
      const byKey = new Map<string, string[]>();
      for (const t of entry.schema as Array<{ variable: string; groupKey?: string }>) {
        if (!t.groupKey) continue;
        const list = byKey.get(t.groupKey) ?? [];
        list.push(t.variable);
        byKey.set(t.groupKey, list);
      }
      const violations: string[] = [];
      for (const [gk, vars] of byKey) {
        const slots = new Set<string>();
        for (const v of vars) {
          const slot = typographySlotOf(v);
          if (slot) slots.add(slot);
        }
        if (slots.size > 1) {
          violations.push(
            `groupKey "${gk}" spans typography slots {${[...slots].join(', ')}}: ${vars.join(', ')}`,
          );
        }
      }
      expect(violations, violations.join('\n')).toEqual([]);
    });
  }
});
