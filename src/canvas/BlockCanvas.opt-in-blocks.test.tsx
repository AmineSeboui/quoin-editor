import { act, screen } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import { fromMarkdown, nodeSelection, textSelection, type QuoinBlock } from '../engine';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';

type OptInCase = {
  block: QuoinBlock;
  /** Text the block holds, which the unsupported block never shows. */
  content: string;
  /** What the plain markdown of the block reads back as. */
  plain: Partial<QuoinBlock>;
};

const table: QuoinBlock = {
  id: 't',
  type: 'TABLE',
  data: { rows: [['Name', 'Size'], ['a', '**2**']], header: true, align: [null, 'right'], widths: [160, 80] },
};
const embed: QuoinBlock = { id: 't', type: 'EMBED', data: { url: 'https://youtu.be/dQw4w9WgXcQ', provider: 'youtube' } };
const bookmark: QuoinBlock = {
  id: 't',
  type: 'BOOKMARK',
  data: { url: 'https://quoin.dev/docs', title: 'Docs', description: 'Read me', image: 'https://cdn.quoin.dev/a.png' },
};
const { widths: _widths, ...gfmTable } = table.data;

const cases: Record<string, OptInCase> = {
  TABLE: { block: table, content: 'Name', plain: { type: 'TABLE', data: gfmTable } },
  EMBED: { block: embed, content: 'youtu.be', plain: { type: 'MARKDOWN', data: { markdown: '<https://youtu.be/dQw4w9WgXcQ>' } } },
  BOOKMARK: { block: bookmark, content: 'Docs', plain: { type: 'MARKDOWN', data: { markdown: '[Docs](https://quoin.dev/docs)' } } },
};

const doc = (block: QuoinBlock, above = 'Above', below = 'Below') => [
  paragraph('a', above),
  structuredClone(block),
  paragraph('b', below),
];
const mount = (blocks: QuoinBlock[], readOnly = false) => mountCanvas(blocks, { readOnly, blockTypes: coreBlocks });
const read = (markdown: string) => fromMarkdown(markdown)[1];

describe.each(Object.keys(cases))('a %s block on a canvas without its extension', (type) => {
  const { block, content, plain } = cases[type];

  describe.each([false, true])('read-only %s', (readOnly) => {
    it('is drawn as an unsupported block that shows none of its content', () => {
      const { shell } = mount(doc(block), readOnly);
      expect(shell('t')).toContainElement(screen.getByRole('group', { name: 'Unsupported block' }));
      expect(shell('t')).not.toHaveTextContent(content);
      expect(shell('t').querySelector('[data-quoin-host], iframe, a, img')).toBeNull();
    });

    it('round-trips its data and its markdown unchanged', () => {
      const { changes, handle } = mount(doc(block), readOnly);
      expect(changes).toEqual([]);
      const { editor } = handle();
      expect(editor.getBlocks()[1]).toEqual(block);
      expect(read(editor.toMarkdown({ lossless: true }))).toMatchObject({ type, data: block.data });
      expect(read(editor.toMarkdown())).toMatchObject(plain);
    });
  });

  describe('on an editable canvas', () => {
    it('is never rewritten by an edit elsewhere', () => {
      const { changes, handle, last } = mount(doc(block));
      act(() => handle().focus({ block: 'b', region: 'text', offset: 5 }));
      act(() => void handle().editor.insertText('!'));
      expect(changes).toHaveLength(1);
      expect(last()[1]).toEqual(block);
      expect(last()[2]).toEqual(paragraph('b', 'Below!'));
    });

    it('is selected whole by the arrows from either side, and passed over to the next line', () => {
      const { handle, press, selection } = mount(doc(block, '', ''));
      act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
      press('ArrowDown');
      expect(selection()).toEqual(nodeSelection('t'));
      press('ArrowDown');
      expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 0 }));
      press('ArrowUp');
      expect(selection()).toEqual(nodeSelection('t'));
    });

    it('is deleted whole once selected, and comes back unchanged with undo', () => {
      const { handle, nodeSelect, press, last } = mount(doc(block));
      nodeSelect('t');
      press('Backspace');
      expect(last().map((each) => each.id)).toEqual(['a', 'b']);
      act(() => void handle().editor.commands.undo());
      expect(last()[1]).toEqual(block);
    });
  });
});
