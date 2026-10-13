import { describe, expect, it } from 'vitest';
import { fromMarkdown } from '../markdown/block/from-markdown';
import { createDoc } from '../model/doc';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const tableOf = (blocks: QuoinBlock[]) => blocks.find((block) => block.type === 'TABLE');

function rowsAfterEditingTheParagraph(markdown: string) {
  const codec = createBlockCodec(createSchema());
  const doc = codec.docFromBlocks([{ id: 'a', type: 'MARKDOWN', data: { markdown } }]);
  const edited = { ...doc.blocks[0], regions: { text: [{ kind: 'text' as const, text: 'Edited', marks: [] }] } };
  const out = codec.blocksFromDoc(createDoc([edited, ...doc.blocks.slice(1)]));
  expect(out[0].data.markdown).toBe('Edited');
  return tableOf(out)?.data.rows;
}

describe('a 0.4 block that holds a table', () => {
  it('keeps the cells of a table Quoin wrote when a sibling piece is edited', () => {
    const rows = [
      ['<code>a\\|b</code>', 'x\\|y'],
      ['plain', '**b**'],
    ];
    const markdown = 'Intro\n\n| <code>a\\|b</code> | x\\|y |\n| --- | --- |\n| plain | **b** |';
    expect(tableOf(fromMarkdown(markdown))?.data.rows).toEqual(rows);
    expect(rowsAfterEditingTheParagraph(markdown)).toEqual(rows);
  });

  it('stores the cells of a foreign table as the engine writes them, so a sibling edit changes nothing in it', () => {
    const markdown = 'Intro\n\n| [!NOTE] | *a* |\n| --- | --- |\n| `a\\|b` | x \\| y |';
    const stored = tableOf(fromMarkdown(markdown))?.data.rows;
    expect(stored).toEqual([
      ['\\[!NOTE\\]', '_a_'],
      ['<code>a\\|b</code>', 'x \\| y'],
    ]);
    expect(rowsAfterEditingTheParagraph(markdown)).toEqual(stored);
  });
});
