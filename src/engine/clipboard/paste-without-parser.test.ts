import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { fromHTML } from './from-html';
import { sliceFromClipboard } from './slice-from-clipboard';

const native = new DOMParser();

describe('pasting in a runtime without DOMParser', () => {
  beforeEach(() => vi.stubGlobal('DOMParser', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('reads the text flavour when the html cannot be parsed', () => {
    const slice = sliceFromClipboard({ html: '<p>from <b>html</b></p>', text: 'from text' });
    expect(slice?.blocks.map((block) => block.data.markdown)).toEqual(['from text']);
  });

  it('has nothing to paste when only html arrived', () => {
    expect(sliceFromClipboard({ html: '<p>x</p>' })).toBeNull();
  });

  it('pastes the text flavour through the editor', () => {
    const { editor } = startEditor([md('a', 'one')]);
    editor.commands.setSelection(caret('a', 3));
    expect(editor.paste({ html: '<p>two</p>', text: ' two' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('one two');
  });

  it('still reads html through a parser it is given', () => {
    const parser = { parseFromString: (html: string) => native.parseFromString(html, 'text/html') };
    expect(sliceFromClipboard({ html: '<p>h</p>', text: 't' }, { parser })?.blocks[0].data.markdown).toBe('h');
  });

  it('keeps fromHTML failing loudly without a parser', () => {
    expect(() => fromHTML('<p>x</p>')).toThrow('fromHTML needs a DOMParser');
  });
});
