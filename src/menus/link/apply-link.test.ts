import { describe, expect, it } from 'vitest';
import { buildState, markdownOf, run } from '../../engine/test-support/build-state';
import { applyLink } from './apply-link';

const atCaret = () => buildState(['see it'], { block: 0, offset: 4 });

describe('applyLink at a caret outside every link', () => {
  it('inserts the text linked to the address', () => {
    const { ok, state } = run(atCaret(), applyLink('https://quoin.dev', 'quoin'));
    expect(ok).toBe(true);
    expect(markdownOf(state)).toEqual(['see [quoin](https://quoin.dev)it']);
  });

  it.each(['javascript:alert(1)', ''])('refuses the unsafe address %j and changes nothing', (href) => {
    const before = atCaret();
    const { ok, state } = run(before, applyLink(href, 'click me'));
    expect(ok).toBe(false);
    expect(state).toBe(before);
  });
});
