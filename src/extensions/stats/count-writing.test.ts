import { createEditor, type QuoinBlock } from '../../engine';
import { countWriting } from './count-writing';

const count = (blocks: QuoinBlock[]) => {
  const { state } = createEditor({ blocks, onChange: () => {} });
  return countWriting(state.doc, state.schema);
};

const table = (rows: string[][]): QuoinBlock => ({ id: 't', type: 'TABLE', data: { rows, header: true } });

describe('the count of what a writer wrote', () => {
  it('counts the text of blocks as the engine does', () => {
    expect(count([{ id: 'a', type: 'MARKDOWN', data: { markdown: '# Two words' } }])).toEqual({ characters: 9, words: 2 });
  });

  it('counts nothing for an empty table, and the text of the cells of a table without separators', () => {
    expect(count([table([['', '', ''], ['', '', ''], ['', '', '']])])).toEqual({ characters: 0, words: 0 });
    expect(count([table([['ab', 'c d'], ['', 'e']])])).toEqual({ characters: 6, words: 4 });
  });

  it.each<QuoinBlock>([
    { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat asleep' } },
    { id: 'f', type: 'FILE', data: { storageKey: 'k', filename: 'report.zip' } },
    { id: 'e', type: 'EMBED', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' } },
    { id: 'b', type: 'BOOKMARK', data: { url: 'https://a.io', title: 'Unfurled a.io' } },
  ])('counts nothing for an attachment such as $type', (block) => {
    expect(count([block])).toEqual({ characters: 0, words: 0 });
  });
});
