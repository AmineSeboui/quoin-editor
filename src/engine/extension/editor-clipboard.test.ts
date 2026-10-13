import { describe, expect, it } from 'vitest';
import { createEditor, createInternalEditor } from './editor';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';

describe('clipboard through the editor', () => {
  it('copies nothing from a caret and writes json, html and text for a selection', () => {
    const { editor } = startEditor([md('a', 'one **two**')]);
    editor.commands.setSelection(caret('a', 2));
    expect(editor.copy()).toBeNull();
    editor.commands.setSelection(range('a', 0, 7));
    const copied = editor.copy()!;
    expect(copied.text).toBe('one two');
    expect(copied.html).toContain('<strong>two</strong>');
    expect(JSON.parse(copied.json)).toMatchObject({ quoin: 1, slice: { openStart: true, openEnd: true } });
  });

  describe('copying uploaded media', () => {
    const image = { id: 'i', type: 'IMAGE', data: { storageKey: 'uploads/abc.png', alt: 'cat' } };
    const file = { id: 'f', type: 'FILE', data: { storageKey: 'uploads/doc.pdf', filename: 'doc.pdf' } };
    const resolveAssetUrl = (key: string) => `https://cdn.test/${key}`;
    const copyBlock = (block: typeof image | typeof file, options: { resolveAssetUrl?: typeof resolveAssetUrl }) => {
      const { editor } = startEditor([block], options);
      editor.commands.setSelection({ kind: 'node', block: block.id });
      return editor.copy()!;
    };

    it('writes the resolved url of an image and a file into the html and the text', () => {
      const copiedImage = copyBlock(image, { resolveAssetUrl });
      expect(copiedImage.html).toContain('src="https://cdn.test/uploads/abc.png"');
      expect(copiedImage.html).not.toContain('"uploads/abc.png"');
      expect(copiedImage.text).toBe('![cat](https://cdn.test/uploads/abc.png)');
      expect(copyBlock(file, { resolveAssetUrl }).html).toContain('href="https://cdn.test/uploads/doc.pdf"');
    });

    it('keeps the sanitizing default without a resolver', () => {
      expect(copyBlock(image, {}).html).toContain('src="uploads/abc.png"');
    });
  });

  it('pastes a lone URL over a selection as a link', () => {
    const { editor } = startEditor([md('a', 'docs')]);
    editor.commands.setSelection(range('a', 0, 4));
    expect(editor.paste({ text: 'https://example.com/a' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('[docs](https://example.com/a)');
  });

  it('pastes a URL at a caret as a link to itself', () => {
    const { editor } = startEditor([md('a', 'see&#32;')]);
    editor.commands.setSelection(caret('a', 4));
    expect(editor.paste({ text: 'https://example.com' })).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('see <https://example.com>');
  });

  it('pastes markdown text as blocks', () => {
    const { editor } = startEditor([md('a', 'one')]);
    editor.commands.setSelection(caret('a', 3));
    expect(editor.paste({ text: '# Title\n\n- item' })).toBe(true);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', '# Title', '- item']);
  });

  it('pastes HTML through the parser it is given', () => {
    const { editor } = startEditor([md('a', 'x')]);
    editor.commands.setSelection(caret('a', 1));
    const parser = { parseFromString: (html: string) => new DOMParser().parseFromString(html, 'text/html') };
    expect(editor.paste({ html: '<p>y <b>z</b></p>' }, parser)).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('xy **z**');
  });

  it('has nothing to paste from empty data, and nowhere to paste in an empty document', () => {
    expect(startEditor([md('a', 'x')]).editor.paste({})).toBe(false);
    expect(startEditor([]).editor.paste({ text: 'hello' })).toBe(false);
  });

  it('pastes a copied slice in one undoable step', () => {
    const { editor } = startEditor([md('a', 'one'), md('b', 'two')]);
    editor.commands.setSelection(range('a', 0, 3));
    const copied = editor.copy()!;
    editor.commands.setSelection(caret('b', 3));
    editor.paste(copied);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'twoone']);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'two']);
  });
});

describe('queries through the editor', () => {
  it('answers isActive for blocks, kinds and attributes', () => {
    const { editor } = startEditor([md('a', '## one')]);
    editor.commands.setSelection(caret('a', 1));
    expect(editor.isActive('heading')).toBe(true);
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    expect(editor.isActive('heading', { level: 3 })).toBe(false);
    expect(editor.isActive('MARKDOWN')).toBe(true);
    expect(editor.isActive('bold')).toBe(false);
  });

  it('exports markdown with the options it is given', () => {
    const { editor } = startEditor([
      md('a', 'plain'),
      { id: 'i', type: 'IMAGE', data: { storageKey: 'k1', alt: 'pic' } },
    ]);
    expect(editor.toMarkdown({ resolveAssetUrl: (key) => `https://cdn.test/${key}` })).toContain('https://cdn.test/k1');
    expect(editor.toMarkdown().endsWith('\n')).toBe(true);
  });

  it('exports markdown with the asset resolver of the editor unless the caller passes one', () => {
    const image = { id: 'i', type: 'IMAGE', data: { storageKey: 'k1', alt: 'pic' } };
    const { editor } = startEditor([image], { resolveAssetUrl: (key) => `https://cdn.test/${key}` });
    expect(editor.toMarkdown()).toBe('![pic](https://cdn.test/k1)\n');
    expect(editor.toMarkdown({ resolveAssetUrl: (key) => `https://other.test/${key}` })).toContain('other.test/k1');
  });

  it('answers can() without changing anything', () => {
    const { editor, onChange } = startEditor([md('a', 'word')]);
    editor.commands.setSelection(range('a', 0, 4));
    expect(editor.can().toggleMark('bold')).toBe(true);
    expect(editor.can().undo()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.getBlocks()).toEqual([md('a', 'word')]);
  });

  it('exposes the schema, and to the package the resolved extensions and the codec it works with', () => {
    const editor = createInternalEditor({ blocks: [md('a', 'x')], isMac: true });
    expect(editor.schema).toBe(editor.resolved.schema);
    expect(editor.codec.docFromBlocks([md('q', 'y')]).blocks[0].id).toBe('q');
    expect(createEditor({ blocks: [md('a', 'x')], isMac: true }).schema.blocks.has('MARKDOWN')).toBe(true);
  });
});
