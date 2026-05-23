import { describe, expect, it } from 'vitest';
import { nextAvailableName } from './nameAllocator';

const existsIn = (set: Set<string>) => (name: string) => set.has(name);

describe('nextAvailableName', () => {
  it('returns the base name when no collision', () => {
    expect(nextAvailableName(existsIn(new Set()), 'runegoblin')).toBe('runegoblin');
  });

  it('appends -2 on first collision', () => {
    const existing = new Set(['runegoblin']);
    expect(nextAvailableName(existsIn(existing), 'runegoblin')).toBe('runegoblin-2');
  });

  it('skips occupied suffixes', () => {
    const existing = new Set(['runegoblin', 'runegoblin-2', 'runegoblin-3']);
    expect(nextAvailableName(existsIn(existing), 'runegoblin')).toBe('runegoblin-4');
  });

  it('walks past gaps in the suffix sequence', () => {
    // Real fs state could include `foo-5` without `foo-2`; the allocator
    // returns the lowest unused suffix starting at -2, even if higher
    // suffixes already exist.
    const existing = new Set(['foo', 'foo-5', 'foo-7']);
    expect(nextAvailableName(existsIn(existing), 'foo')).toBe('foo-2');
  });

  it('throws when maxAttempts is exhausted', () => {
    const existing = new Set(['x', 'x-2', 'x-3', 'x-4']);
    expect(() => nextAvailableName(existsIn(existing), 'x', 4)).toThrow();
  });
});
