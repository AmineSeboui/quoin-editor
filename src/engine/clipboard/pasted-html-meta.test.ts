// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildState, newIds, run } from '../test-support/build-state';
import { insertSlice } from './insert-slice';
import { PASTED_HTML } from './slice';
import { sliceFromClipboard, type ClipboardData } from './slice-from-clipboard';

function pastedHTML(data: ClipboardData): unknown {
  const state = buildState(['x'], { block: 0, offset: 1 });
  const slice = sliceFromClipboard(data, { newId: newIds('p') })!;
  return run(state, insertSlice(slice, { newId: newIds('q') })).tr?.getMeta(PASTED_HTML);
}

describe('a paste read from HTML', () => {
  it('marks its transaction, and a paste of the editor slice or of text does not', () => {
    const slice = { blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'a' } }], openStart: true, openEnd: true };
    expect(pastedHTML({ html: '<h2>a</h2>' })).toBe(true);
    expect(pastedHTML({ html: '<h2>a</h2>', json: JSON.stringify({ quoin: 1, slice }) })).toBeUndefined();
    expect(pastedHTML({ text: '## a' })).toBeUndefined();
  });
});
