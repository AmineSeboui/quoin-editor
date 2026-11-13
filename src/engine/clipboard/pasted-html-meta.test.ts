// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createEditor } from '../extension/editor';
import type { Transaction } from '../state/transaction';
import { PASTED_HTML } from './slice';

function pastedHTML(data: { html?: string; json?: string; text?: string }): unknown {
  const seen: Transaction[] = [];
  const editor = createEditor({ blocks: [], onTransaction: (tr) => seen.push(tr) });
  expect(editor.paste(data)).toBe(true);
  return seen.find((tr) => tr.origin === 'paste')?.getMeta(PASTED_HTML);
}

describe('a paste read from HTML', () => {
  it('marks its transaction, and a paste of the editor slice or of text does not', () => {
    const slice = { blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'a' } }], openStart: true, openEnd: true };
    expect(pastedHTML({ html: '<h2>a</h2>' })).toBe(true);
    expect(pastedHTML({ html: '<h2>a</h2>', json: JSON.stringify({ quoin: 1, slice }) })).toBeUndefined();
    expect(pastedHTML({ text: '## a' })).toBeUndefined();
  });
});
