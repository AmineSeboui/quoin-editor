import { act, fireEvent, screen, within } from '@testing-library/react';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { nodeSelection, textSelection } from '../../engine';
import { inlineText } from '../../engine/model/inline';
import type { QuoinBlock } from '../../types';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function openAt(blocks: QuoinBlock[], block: string, offset = 0) {
  const canvas = mountCanvas(blocks);
  act(() => canvas.handle().focus({ block, region: 'text', offset }));
  const host = (id: string) => canvas.shell(id).querySelector<HTMLElement>('[data-quoin-host]');
  const choose = (query: string) => {
    type(query);
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  };
  const shape = () => canvas.last().map((item) => `${item.type}:${item.data.markdown ?? ''}`);
  return { ...canvas, host, choose, shape };
}

const caretAt = (block: string) => textSelection({ block, region: 'text', offset: 0 });

describe('a block chosen from the slash menu that takes no typing', () => {
  it('a divider goes above the empty line it was chosen on, which keeps the caret, so typing goes on there', () => {
    const canvas = openAt([paragraph('a', '')], 'a');
    canvas.choose('/divider');
    expect(canvas.last()).toEqual([{ id: expect.any(String), type: 'DIVIDER', data: {} }, paragraph('a', '')]);
    expect(canvas.selection()).toEqual(caretAt('a'));
    expect(document.activeElement).toBe(canvas.host('a'));
    type('xy');
    expect(canvas.shape()).toEqual(['DIVIDER:', 'MARKDOWN:xy']);
  });

  it('a divider after text gets a new empty line after it for the caret', () => {
    const canvas = openAt([paragraph('a', 'one'), paragraph('b', 'two')], 'a', 3);
    canvas.choose(' /divider');
    const line = canvas.last()[2];
    expect(canvas.last().map((item) => item.type)).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN', 'MARKDOWN']);
    expect(line).toEqual(paragraph(line.id, ''));
    expect(canvas.selection()).toEqual(caretAt(line.id));
    expect(document.activeElement).toBe(canvas.host(line.id));
    type('xy');
    expect(canvas.shape().slice(2)).toEqual(['MARKDOWN:xy', 'MARKDOWN:two']);
  });

  it('a divider takes the empty line already after it for the caret', () => {
    const canvas = openAt([paragraph('a', 'one'), paragraph('e', '')], 'a', 3);
    canvas.choose(' /divider');
    expect(canvas.last().map((item) => item.id).filter((id) => id.length === 1)).toEqual(['a', 'e']);
    expect(canvas.shape()).toHaveLength(3);
    expect(canvas.selection()).toEqual(caretAt('e'));
  });

  it('a custom block without an editor goes above the empty line, which keeps the caret', () => {
    const canvas = openAt([paragraph('a', '')], 'a');
    canvas.choose('/preview');
    expect(canvas.last().map((item) => item.type)).toEqual(['LINK_PREVIEW', 'MARKDOWN']);
    expect(canvas.selection()).toEqual(caretAt('a'));
    expect(document.activeElement).toBe(canvas.host('a'));
  });
});

describe('a block chosen from the slash menu that has an editor', () => {
  it('a code block lands the caret in its code', () => {
    const canvas = openAt([paragraph('a', '')], 'a');
    canvas.choose('/code');
    expect(canvas.last()).toEqual([{ id: 'a', type: 'CODE', data: { language: '', code: '' } }]);
    expect(canvas.selection()).toEqual(nodeSelection('a'));
    expect(document.activeElement).toBe(within(screen.getByRole('group', { name: 'Code' })).getByRole('textbox', { name: 'Code' }));
  });

  it('an image is selected as a block with its editor open, never with a caret in its caption', () => {
    const canvas = openAt([paragraph('a', 'one')], 'a', 3);
    canvas.choose(' /image');
    const image = canvas.last()[1];
    expect(image).toMatchObject({ type: 'IMAGE' });
    expect(canvas.selection()).toEqual(nodeSelection(image.id));
    const editor = canvas.shell(image.id).querySelector('[role="group"]')!;
    expect(editor.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(editor);
  });

  it('a custom block opens its editor', () => {
    const canvas = openAt([paragraph('a', '')], 'a');
    canvas.choose('/bookm');
    expect(canvas.last()).toEqual([{ id: 'a', type: 'BOOKMARK', data: { url: 'new.example' } }]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Bookmark URL' }));
  });
});

describe('the space before a slash typed after a word', () => {
  it('goes with the slash when the command adds a block, so the line keeps no trailing space', () => {
    const canvas = openAt([paragraph('a', 'one')], 'a', 3);
    canvas.choose(' /quote');
    expect(canvas.last()[0]).toEqual(paragraph('a', 'one'));
    expect(canvas.last()[1]).toMatchObject({ type: 'MARKDOWN', data: { markdown: '> ' } });
  });

  it('goes with the slash before a divider is put in, leaving a line of only a space empty', () => {
    const canvas = openAt([paragraph('a', '')], 'a');
    canvas.choose(' /divider');
    expect(canvas.last()).toEqual([{ id: expect.any(String), type: 'DIVIDER', data: {} }, paragraph('a', '')]);
  });

  it('stays when words follow the query, so they keep their space', () => {
    const canvas = openAt([paragraph('a', 'one two')], 'a', 4);
    canvas.choose('/quote');
    expect(canvas.last()[0]).toEqual(paragraph('a', 'one two'));
  });

  it('never takes a line break the slash was typed after', () => {
    const canvas = openAt([paragraph('a', 'one two')], 'a', 3);
    const lineBreak = new InputEvent('beforeinput', { inputType: 'insertLineBreak', bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, lineBreak);
    canvas.choose('/quote');
    const [line] = canvas.handle().editor.state.doc.blocks;
    expect(inlineText(line.regions.text)).toBe('one\n two');
  });

  it('comes back with the slash and the query in one undo', () => {
    const canvas = openAt([paragraph('a', 'one')], 'a', 3);
    canvas.choose(' /divider');
    const mod = canvas.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    fireEvent.keyDown(document.activeElement!, { key: 'z', ...mod });
    expect(canvas.last()).toEqual([paragraph('a', 'one /divider')]);
  });
});
