import { describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { inlineText } from '../../engine/model/inline';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { handleBeforeInput } from './before-input';

function setup(markdown = 'hi') {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown } }] });
  const controller = new ViewController({ editor });
  const host = document.createElement('div');
  host.contentEditable = 'true';
  document.body.appendChild(host);
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: markdown.length })));
  const text = () => inlineText(editor.state.doc.blocks[0].regions.text);
  return { editor, controller, host, text };
}

const input = (inputType: string, data: string | null = null) =>
  new InputEvent('beforeinput', { inputType, data, cancelable: true, bubbles: true });

function targeting(event: InputEvent, node: Node, from: number, to: number): InputEvent {
  const range = { startContainer: node, startOffset: from, endContainer: node, endOffset: to, collapsed: from === to };
  Object.defineProperty(event, 'getTargetRanges', { value: () => [range] });
  return event;
}

describe('handleBeforeInput', () => {
  it('inserts text with markdown shortcuts and prevents the default', () => {
    const { editor, controller } = setup('');
    const event = input('insertText', '#');
    handleBeforeInput(controller, event);
    handleBeforeInput(controller, input('insertText', ' '));
    expect(event.defaultPrevented).toBe(true);
    expect(editor.getBlocks()[0].data.markdown).toBe('# ');
  });

  it('splits on insertParagraph and joins on deleteContentBackward', () => {
    const { editor, controller } = setup('ab');
    handleBeforeInput(controller, input('insertParagraph'));
    expect(editor.getBlocks().map((b) => b.data.markdown)).toEqual(['ab', '']);
    handleBeforeInput(controller, input('deleteContentBackward'));
    expect(editor.getBlocks().map((b) => b.data.markdown)).toEqual(['ab']);
  });

  it('formats and undoes through native input types', () => {
    const { editor, controller } = setup('ab');
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 0 }, { block: 'a', region: 'text', offset: 2 })));
    handleBeforeInput(controller, input('formatBold'));
    expect(editor.getBlocks()[0].data.markdown).toBe('**ab**');
    handleBeforeInput(controller, input('historyUndo'));
    expect(editor.getBlocks()[0].data.markdown).toBe('ab');
  });

  it('leaves composition and unknown types to the browser', () => {
    const { controller } = setup();
    const composing = input('insertCompositionText', 'に');
    handleBeforeInput(controller, composing);
    expect(composing.defaultPrevented).toBe(false);
    const unknown = input('insertFromYank', 'x');
    handleBeforeInput(controller, unknown);
    expect(unknown.defaultPrevented).toBe(false);
  });

  it('deletes the range the browser targets, or runs the engine command when there is none', () => {
    const { controller, host, text } = setup('one two three');
    handleBeforeInput(controller, targeting(input('deleteWordBackward'), host.firstChild!, 4, 8));
    expect(text()).toBe('one three');
    handleBeforeInput(controller, input('deleteWordBackward'));
    expect(text()).toBe('three');
    handleBeforeInput(controller, input('deleteSoftLineForward'));
    expect(text()).toBe('');
  });

  it('prefers a target range that differs from the model selection for Backspace', () => {
    const { controller, host, text } = setup('abc');
    handleBeforeInput(controller, targeting(input('deleteContentBackward'), host.firstChild!, 3, 3));
    expect(text()).toBe('ab');
    handleBeforeInput(controller, targeting(input('deleteContentBackward'), host.firstChild!, 0, 1));
    expect(text()).toBe('b');
  });

  it('undoes an input rule with Backspace before deleting anything', () => {
    const { editor, controller } = setup('');
    handleBeforeInput(controller, input('insertText', '-'));
    handleBeforeInput(controller, input('insertText', ' '));
    expect(editor.getBlocks()[0].data.markdown).toBe('- ');
    handleBeforeInput(controller, input('deleteContentBackward'));
    expect(editor.getBlocks()[0].data.markdown).toBe('\\-&#32;');
  });

  it('replaces the targeted word with the replacement text', () => {
    const { controller, host, text } = setup('teh cat');
    handleBeforeInput(controller, targeting(input('insertReplacementText', 'the'), host.firstChild!, 0, 3));
    expect(text()).toBe('the cat');
  });

  it('inserts a hard break and transposes characters', () => {
    const { controller, text } = setup('ab');
    handleBeforeInput(controller, input('insertTranspose'));
    expect(text()).toBe('ba');
    handleBeforeInput(controller, input('insertLineBreak'));
    expect(text()).toBe('ba\n');
  });

  it('prevents paste, drop and cut without touching the document', () => {
    const { controller, text } = setup('ab');
    for (const type of ['insertFromPaste', 'insertFromDrop', 'deleteByCut', 'deleteByDrag']) {
      const event = input(type, 'x');
      handleBeforeInput(controller, event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(text()).toBe('ab');
  });

  it('never prevents a non-cancelable event or one that belongs to a composition', () => {
    const { controller, text } = setup('ab');
    const fixed = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', cancelable: false });
    handleBeforeInput(controller, fixed);
    const composing = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', cancelable: true, isComposing: true });
    handleBeforeInput(controller, composing);
    controller.composingKey = 'a';
    const during = input('insertText', 'x');
    handleBeforeInput(controller, during);
    expect([fixed, composing, during].map((event) => event.defaultPrevented)).toEqual([false, false, false]);
    expect(text()).toBe('ab');
  });
});
