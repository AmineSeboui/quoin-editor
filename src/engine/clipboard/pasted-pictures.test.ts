// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createEditor } from '../extension/editor';
import type { QuoinBlock } from '../model/quoin-block';
import { textSelection } from '../state/selection';
import type { Transaction } from '../state/transaction';
import { fromHTML } from './from-html';
import { PASTED_PICTURES, type PastedPicture } from './pasted-pictures';

const INLINE = 'data:image/png;base64,iVBORw0KGgo=';
const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

function pasteAt(blocks: QuoinBlock[], offset: number, html: string) {
  const committed: Transaction[] = [];
  let n = 0;
  const editor = createEditor({ blocks, newId: () => `p${++n}`, onTransaction: (tr) => committed.push(tr) });
  editor.dispatch(editor.createTransaction().setSelection(textSelection({ block: blocks[0].id, region: 'text', offset })));
  const handled = editor.paste({ html });
  const paste = committed.find((tr) => tr.origin === 'paste');
  const pictures = paste?.getMeta<PastedPicture[]>(PASTED_PICTURES) ?? [];
  const markdown = editor.getBlocks().map((block) => (block.type === 'MARKDOWN' ? block.data.markdown : block.type));
  const blockAt = (id: string | null) => (id === null ? null : editor.getBlocks().find((block) => block.id === id)?.data.markdown);
  const { selection } = editor.state;
  const caret = selection?.kind === 'text' ? [blockAt(selection.head.block), selection.head.offset] : null;
  return { handled, committed, markdown, pictures, caret, anchors: pictures.map(({ after }) => blockAt(after)) };
}

describe('a picture a paste carries inline', () => {
  it('stays out of what fromHTML returns', () => {
    expect(fromHTML(`<p>a</p><img src="${INLINE}"><p>b</p>`).map((block) => block.type)).toEqual(['MARKDOWN', 'MARKDOWN']);
  });

  it('is held out of the document and of every step, with the block it came after', () => {
    const html = `<p>Above</p><figure><img src="${INLINE}" alt="Cat"><figcaption>A cat</figcaption></figure><p>Below</p>`;
    const { markdown, pictures, anchors, committed } = pasteAt([md('a', '')], 0, html);
    expect(markdown).toEqual(['Above', 'Below']);
    expect(pictures.map(({ url, block }) => [url, block.type, block.attrs.alt, block.regions.caption])).toEqual([
      [INLINE, 'IMAGE', 'Cat', [{ kind: 'text', text: 'A cat', marks: [] }]],
    ]);
    expect(anchors).toEqual(['Above']);
    expect(JSON.stringify(committed.map((tr) => [tr.steps, tr.doc.blocks]))).not.toContain('base64');
  });

  it('keeps the text around it as a paste without it would, and the caret where the paste ends', () => {
    const { markdown, anchors, caret } = pasteAt([md('a', 'abcd')], 2, `<p>x</p><img src="${INLINE}"><p>y</p>`);
    expect(markdown).toEqual(['abx', 'ycd']);
    expect(anchors).toEqual(['abx']);
    expect(caret).toEqual(['ycd', 1]);
  });

  it('comes after the last pasted block when it ends the paste, and leaves the caret at the end of that block', () => {
    const { markdown, anchors, caret } = pasteAt([md('a', '')], 0, `<p>x</p><img src="${INLINE}"><img src="${INLINE}#2">`);
    expect(markdown).toEqual(['x']);
    expect(anchors).toEqual(['x', 'x']);
    expect(caret).toEqual(['x', 1]);
  });

  it('comes after nothing when it opens a paste at the top of the document', () => {
    const { markdown, pictures } = pasteAt([md('a', '')], 0, `<img src="${INLINE}"><p>x</p>`);
    expect(markdown).toEqual(['x']);
    expect(pictures.map(({ after }) => after)).toEqual([null]);
  });

  it('is all a paste can hold, and then comes after the block the caret is in, which stays as it was', () => {
    const { handled, markdown, anchors } = pasteAt([md('a', 'text')], 4, `<img src="${INLINE}" alt="Cat">`);
    expect(handled).toBe(true);
    expect(markdown).toEqual(['text']);
    expect(anchors).toEqual(['text']);
  });

  it('is only a picture, never another data address', () => {
    const { markdown, pictures } = pasteAt([md('a', '')], 0, '<p>x</p><img src="data:text/html,<b>x</b>">');
    expect(markdown).toEqual(['x']);
    expect(pictures).toEqual([]);
  });
});
