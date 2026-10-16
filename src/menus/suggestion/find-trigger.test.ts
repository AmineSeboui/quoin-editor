import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { findTrigger } from './find-trigger';

const slash = { char: '/' };
const at = (paragraph: string, offset = paragraph.length) => buildState([{ paragraph }], { block: 0, offset });

describe('findTrigger', () => {
  it.each([
    ['/', ''],
    ['/hea', 'hea'],
    ['note /bul', 'bul'],
  ])('opens for %j with query %j', (text, query) => {
    expect(findTrigger(at(text), slash)).toMatchObject({ block: 'b0', query });
  });

  it.each(['a/b', 'path/to', '/two words', 'x'])('stays closed for %j', (text) => {
    expect(findTrigger(at(text), slash)).toBeNull();
  });

  it('requires the region start with startOfLine', () => {
    expect(findTrigger(at('x /h'), { char: '/', startOfLine: true })).toBeNull();
  });

  it('never opens inside code', () => {
    expect(findTrigger(buildState(['`/x`'], { block: 0, offset: 2 }), slash)).toBeNull();
  });

  it('allows spaces when asked, up to the length cap', () => {
    expect(findTrigger(at('@Ada Lov'), { char: '@', allowSpaces: true })).toMatchObject({ query: 'Ada Lov' });
    expect(findTrigger(at('/' + 'x'.repeat(41)), slash)).toBeNull();
  });
});
