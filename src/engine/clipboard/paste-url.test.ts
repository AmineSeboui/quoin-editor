import { describe, expect, it } from 'vitest';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';
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
