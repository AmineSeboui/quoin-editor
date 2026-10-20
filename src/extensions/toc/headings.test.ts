import { createEditor, type QuoinBlock } from '../../engine';
import { headings } from './headings';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

function headingsOf(blocks: QuoinBlock[]) {
  const { doc, schema } = createEditor({ blocks }).state;
  return headings(doc, schema);
}

describe('headings', () => {
  it('is empty for an empty document and for one without headings', () => {
    expect(headingsOf([])).toEqual([]);
    expect(headingsOf([md('p', 'Text'), md('l', '#hashtag'), { id: 't', type: 'TOC', data: {} }])).toEqual([]);
  });

  it('lists the headings in order with their block id, anchor, level and text', () => {
    expect(headingsOf([md('a', '# One'), md('p', 'Text'), md('b', '## Two'), md('c', '###### Six')])).toEqual([
      { blockId: 'a', anchor: 'h-a', level: 1, text: 'One' },
      { blockId: 'b', anchor: 'h-b', level: 2, text: 'Two' },
      { blockId: 'c', anchor: 'h-c', level: 6, text: 'Six' },
    ]);
  });

  it('keeps a skipped level as it is, for the list to nest', () => {
    const listed = headingsOf([md('a', '# Top'), md('b', '### Deep'), md('c', '## Middle')]);
    expect(listed.map(({ level }) => level)).toEqual([1, 3, 2]);
  });

  it('reads the plain text of a heading with marks and atoms', () => {
    const markdown = '## A **bold** _move_ by [@Ada](mention:1) with $x^2$ and [a link](https://quoin.dev)';
    const [heading] = headingsOf([md('a', markdown)]);
    expect(heading.text).toBe('A bold move by @Ada with x^2 and a link');
  });

  it('leaves out a heading with no text', () => {
    expect(headingsOf([md('a', '#'), md('b', '## Kept')]).map(({ blockId }) => blockId)).toEqual(['b']);
  });
});
