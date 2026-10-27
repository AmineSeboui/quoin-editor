import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { inlineText } from '../engine/model/inline';
import { sameDoc } from '../engine/model/same-doc';
import { writeBlocks } from './doc-shape';
import { spanStart } from './layout';
import { readShared } from './read-shared';
import { heldPlainly } from './test-support/layout-shape';
import { arbitraryToken, writeTokens } from './test-support/tokens';

const OBJECT = '\uFFFC';

// Each position of the text as one character: the character itself, OBJECT for an atom, and null for anything else.
function positions(text: Y.Text): (string | null)[] {
  return (text.toDelta() as { insert: unknown }[]).flatMap(({ insert }) => {
    if (typeof insert === 'string') return [...insert];
    const isAtom = !(insert instanceof Y.AbstractType) && typeof (insert as { atom?: unknown }).atom === 'string';
    return [isAtom ? OBJECT : null];
  });
}

describe('reading a shared text whatever it holds', () => {
  it('gives every client the same document, never fails, and maps each region onto its own characters', () => {
    fc.assert(
      fc.property(fc.array(arbitraryToken, { maxLength: 24 }), (tokens) => {
        const doc = new Y.Doc();
        const text = doc.getText('quoin');
        writeTokens(text, tokens);
        const other = new Y.Doc();
        Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
        const read = readShared(text);
        expect(readShared(other.getText('quoin')).doc).toEqual(read.doc);
        expect(readShared(text).doc).toEqual(read.doc);
        expect(new Set(read.doc.blocks.map((block) => block.id)).size).toBe(read.doc.blocks.length);
        const at = positions(text);
        for (const block of read.doc.blocks) {
          const entry = read.layout.entries.get(block.id)!;
          expect(entry.regions.map((region) => region.name)).toEqual(Object.keys(block.regions));
          for (const region of entry.regions) {
            const held = region.segs.flatMap((seg) => {
              const from = spanStart(read.layout, seg.host) + seg.at;
              return at.slice(from, from + seg.length);
            });
            expect(held.join('')).toBe(inlineText(block.regions[region.name]));
            expect(held).not.toContain(null);
          }
        }
      }),
      { seed: 20261021, numRuns: 1000 },
    );
  });

  it('reads the document it gives back as itself once written again', () => {
    fc.assert(
      fc.property(fc.array(arbitraryToken, { maxLength: 24 }), (tokens) => {
        const text = new Y.Doc().getText('quoin');
        writeTokens(text, tokens);
        const { doc } = readShared(text);
        const again = new Y.Doc().getText('quoin');
        writeBlocks(again, 0, doc.blocks);
        const back = readShared(again);
        expect(sameDoc(back.doc, doc)).toBe(true);
        expect(heldPlainly(back.layout)).toBe(true);
      }),
      { seed: 20261021, numRuns: 500 },
    );
  });
});
