import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './new-id';

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a different id on every call', () => {
    expect(new Set(Array.from({ length: 500 }, () => newId())).size).toBe(500);
  });

  it('still returns distinct ids where crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const ids = Array.from({ length: 500 }, () => newId());
    expect(new Set(ids).size).toBe(500);
    expect(ids[0]).toMatch(/^blk-/);
  });

  it('still returns an id where there is no crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(newId()).toMatch(/^blk-\S+$/);
  });
});
