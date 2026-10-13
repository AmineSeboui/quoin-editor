import { describe, expect, it } from 'vitest';
import { createDoc } from './doc';
import { text } from './inline';
import { sameDoc } from './same-doc';
import type { EngineBlock } from './types';

const block = (id: string, value: string, bold = false): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: [text(value, bold ? [{ type: 'bold' }] : [])] },
});

describe('sameDoc', () => {
  it('treats documents built from equal blocks as the same', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    expect(sameDoc(doc, doc)).toBe(true);
    expect(sameDoc(doc, createDoc([block('a', 'one'), block('b', 'two')]))).toBe(true);
  });

  it('tells apart a missing block, another text or another mark', () => {
    const doc = createDoc([block('a', 'one'), block('b', 'two')]);
    expect(sameDoc(doc, createDoc([block('a', 'one')]))).toBe(false);
    expect(sameDoc(doc, createDoc([block('a', 'one'), block('b', 'too')]))).toBe(false);
    expect(sameDoc(doc, createDoc([block('a', 'one'), block('b', 'two', true)]))).toBe(false);
  });
});
