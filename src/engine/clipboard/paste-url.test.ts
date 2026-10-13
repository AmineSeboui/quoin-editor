import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import { insertTextWithRules } from '../rules/input-rule';
import { markInputRules } from '../rules/mark-rules';
import type { EditorState } from '../state/editor-state';
import { buildState, run } from '../test-support/build-state';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';
import { insertSlice } from './insert-slice';
import { loneUrl } from './paste-url';
import { sliceFromClipboard } from './slice-from-clipboard';

const markdownOfPaste = (text: string) => sliceFromClipboard({ text })?.blocks.map((block) => block.data.markdown);

describe('loneUrl', () => {
  it('accepts a single http, https or www token', () => {
    expect(loneUrl(' https://a.b/c \n')).toBe('https://a.b/c');
    expect(loneUrl('www.example.com')).toBe('www.example.com');
    expect(loneUrl('WWW.example.com/x')).toBe('WWW.example.com/x');
    expect(loneUrl('mailto:a@b.c')).toBeNull();
    expect(loneUrl('mailto:a@b.c', 'linkable')).toBe('mailto:a@b.c');
  });

  it('rejects text that is not one address', () => {
    const texts = ['www.', 'www..', 'www.a b', 'wwwexample.com', 'xwww.example.com', 'see www.example.com'];
    for (const text of [...texts, 'ftp://a.b', 'https://', 'mailto:']) {
      expect(loneUrl(text), text).toBeNull();
      expect(loneUrl(text, 'linkable'), text).toBeNull();
    }
  });
});

describe('pasting a www address', () => {
  it('becomes a link to its https form, written as typed', () => {
    expect(markdownOfPaste(' www.example.com/a_b ')).toEqual(['[www.example.com/a_b](https://www.example.com/a_b)']);
  });

  it('still writes an http url as an autolink', () => {
    expect(markdownOfPaste('https://a.b')).toEqual(['<https://a.b>']);
  });

  it('stays plain text when it is more than one token', () => {
    expect(markdownOfPaste('www.example.com and more')).toEqual(['www.example.com and more']);
  });

  it('is linked at a caret through the editor', () => {
    const { editor } = startEditor([md('a', 'see&#32;')]);
    editor.commands.setSelection(caret('a', 4));
    expect(editor.paste({ text: 'www.example.com' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('see [www.example.com](https://www.example.com)');
  });

  it('links the selected text when pasted over a selection', () => {
    const { editor } = startEditor([md('a', 'go here')]);
    editor.commands.setSelection(range('a', 3, 7));
    expect(editor.paste({ text: 'www.example.com' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('go [here](https://www.example.com)');
  });
});

describe('pasting an address that ends in punctuation', () => {
  const linksOf = (state: EditorState) =>
    state.doc.blocks[0].regions.text.flatMap((node) => {
      const link = node.marks.find((mark) => mark.type === 'link');
      return link === undefined || node.kind !== 'text' ? [] : [[node.text, link.attrs?.href]];
    });
  const typed = (address: string) => {
    const state = buildState([{ paragraph: address }], { block: 0, offset: address.length });
    return run(state, insertTextWithRules(' ', markInputRules));
  };
  const pasted = (address: string) =>
    run(buildState([''], { block: 0, offset: 0 }), insertSlice(sliceFromClipboard({ text: address })!));

  it.each(['www.example.com.', 'https://a.b/c,', 'https://a.b?!', 'https://a.b/x_(y))', "www.a.b/c';", 'www.!'])(
    'links %j the way typing it does',
    (address) => {
      const { state } = pasted(address);
      expect(linksOf(state)).toEqual(linksOf(typed(address).state));
      expect(inlineText(state.doc.blocks[0].regions.text)).toBe(address);
    },
  );

  it('writes the punctuation after the link', () => {
    expect(markdownOfPaste('www.example.com.')).toEqual(['[www.example.com](https://www.example.com).']);
  });

  it('leaves the punctuation out of the link put on a selection', () => {
    const { editor } = startEditor([md('a', 'go here')]);
    editor.commands.setSelection(range('a', 3, 7));
    expect(editor.paste({ text: 'www.example.com.' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('go [here](https://www.example.com)');
  });
});
