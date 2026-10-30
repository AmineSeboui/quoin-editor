import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fromMarkdown } from '../markdown/block/from-markdown';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const make = () => {
  let n = 0;
  return createBlockCodec(createSchema(), { newId: () => `n${++n}` });
};
const legacy = (markdown: string): QuoinBlock => ({ id: 'a', type: 'MARKDOWN', data: { markdown } });
const reads = (markdown: string) => {
  const blocks = fromMarkdown(markdown, { softBreak: 'newline', newId: () => 'x' });
  return blocks.length === 0 && markdown.trim() === '' ? [legacy('')] : blocks;
};
const stripIds = (blocks: QuoinBlock[]) => blocks.map(({ id: _id, ...rest }) => rest);
const rewritten = (markdown: string) => {
  const codec = make();
  const doc = codec.docFromBlocks([legacy(markdown)]);
  return stripIds(doc.blocks.map((block) => make().toQuoin({ ...block })));
};

describe('0.4 MARKDOWN blocks that hold one node', () => {
  it.each([
    ['trailing newline', 'Hello\n', 'Hello'],
    ['heading with trailing newline', '# Title\n', '# Title'],
    ['setext heading', 'Title\n===', '# Title'],
    ['two line quote', '> a\n> b', '> a\\\nb'],
    ['CRLF line break', 'a\r\nb', 'a\\\nb'],
    ['empty quoin comment', '<!-- quoin:MARKDOWN {"data":{"markdown":""}} -->', ''],
    ['whitespace only', '\n', ''],
  ])('reads %s with the block parser and keeps its identity until an edit', (_name, markdown, canonical) => {
    const codec = make();
    const block = legacy(markdown);
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks).toHaveLength(1);
    expect(codec.blocksFromDoc(doc)[0]).toBe(block);
    const stored = make().toQuoin({ ...doc.blocks[0] }).data.markdown;
    expect(stored).toBe(canonical);
    expect(stored).not.toContain('<br>');
    expect(stripIds([make().toQuoin({ ...doc.blocks[0] })])).toEqual(stripIds(reads(markdown)));
  });

  it('reads a one line image as an IMAGE block', () => {
    const codec = make();
    const block = legacy('![alt](https://x/y.png)');
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks.map((b) => b.type)).toEqual(['IMAGE']);
    expect(codec.blocksFromDoc(doc)[0]).toBe(block);
    expect(rewritten(block.data.markdown as string)).toEqual(stripIds(reads(block.data.markdown as string)));
  });

  it.each(['* * *', '- - -', '_ _ _'])('reads %j as a DIVIDER', (markdown) => {
    const codec = make();
    const block = legacy(markdown);
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks.map((b) => b.type)).toEqual(['DIVIDER']);
    expect(codec.blocksFromDoc(doc)[0]).toBe(block);
  });

  it('keeps the extra data of the original on a single node that is read canonically', () => {
    const codec = make();
    const block: QuoinBlock = { id: 'a', type: 'MARKDOWN', data: { markdown: 'Hello\n', align: 'center' } };
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks[0].attrs).toMatchObject({ kind: 'paragraph', align: 'center' });
    expect(make().toQuoin({ ...doc.blocks[0] }).data).toEqual({ markdown: 'Hello', align: 'center' });
  });

  it('keeps the base indent of a single node that is read canonically', () => {
    const doc = make().docFromBlocks([{ ...legacy('Title\n==='), indent: 2 }]);
    expect(doc.blocks.map((b) => [b.attrs.kind, b.indent])).toEqual([['heading', 2]]);
  });

  it('reads every short block as fromMarkdown reads it', () => {
    const alphabet = fc.constantFrom(...'aZ1 \t#-*_>`~|![]():<$\\=+.&\u00a0\n\r');
    const chars = fc.array(alphabet, { maxLength: 12 }).map((list) => list.join(''));
    const letterFirst = fc.tuple(fc.constantFrom('a', 'Q', '\u00e9', '\u4e2d'), chars).map(([head, tail]) => head + tail);
    fc.assert(
      fc.property(fc.oneof(chars, letterFirst), (markdown) => {
        const expected = reads(markdown);
        if (expected.length === 0) {
          expect(rewritten(markdown).map((block) => block.type)).toEqual(['MARKDOWN']);
          return;
        }
        expect(rewritten(markdown)).toEqual(stripIds(expected));
      }),
      { numRuns: 3000 },
    );
  });
});
