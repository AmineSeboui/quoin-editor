import { afterEach, describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { inlineText } from '../../engine/model/inline';
import { blockRangeSelection, textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';

const detachers: (() => void)[] = [];

afterEach(() => {
  detachers.splice(0).forEach((detach) => detach());
  document.body.replaceChildren();
});

function mount() {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'hi' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'yo' } },
    ],
  });
  const controller = new ViewController({ editor });
  const root = document.createElement('div');
  document.body.appendChild(root);
  const addHost = (id: string) => {
    const host = document.createElement('div');
    host.contentEditable = 'true';
    root.appendChild(host);
    controller.registry.register(id, 'text', host);
    controller.renderHost(id, 'text');
    return host;
  };
  const text = (index: number) => inlineText(editor.state.doc.blocks[index].regions.text);
  return { editor, controller, root, addHost, text };
}

const beforeInput = (data: string) =>
  new InputEvent('beforeinput', { inputType: 'insertText', data, cancelable: true, bubbles: true });
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

function type(host: HTMLElement, data: string): void {
  const node = host.firstChild as Text;
  node.data = data;
  document.getSelection()!.collapse(node, data.length);
}

describe('attached input', () => {
  it('handles beforeinput from its hosts and ignores other targets', () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    host.dispatchEvent(beforeInput('!'));
    expect(text(0)).toBe('hi!');
    const field = document.createElement('input');
    root.appendChild(field);
    const outside = beforeInput('x');
    field.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
    expect(text(0)).toBe('hi!');
  });

  it('reads browser edits in hosts registered before and after attaching, until detached', async () => {
    const { controller, root, addHost, text } = mount();
    const early = addHost('a');
    const detach = controller.attach(root);
    const late = addHost('b');
    type(early, 'hi!');
    type(late, 'yo!');
    await nextTask();
    expect([text(0), text(1)]).toEqual(['hi!', 'yo!']);
    detach();
    type(late, 'yo?');
    await nextTask();
    expect(text(1)).toBe('yo!');
  });

  it('runs the keymap on keydown in a host, but not for composing keys or in read-only mode', () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    const key = (init: KeyboardEventInit = {}) =>
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true, bubbles: true, ...init });
    const hardBreak = key();
    host.dispatchEvent(hardBreak);
    expect(hardBreak.defaultPrevented).toBe(true);
    expect(text(0)).toBe('hi\n');
    const ignored = [key({ isComposing: true }), key({ keyCode: 229 }), key({ key: 'x', shiftKey: false })];
    ignored.forEach((event) => host.dispatchEvent(event));
    controller.setReadOnly(true);
    const readOnly = key();
    host.dispatchEvent(readOnly);
    expect([...ignored, readOnly].map((event) => event.defaultPrevented)).toEqual([false, false, false, false]);
    expect(text(0)).toBe('hi\n');
  });

  it('runs keys on a selected block element, but not on other elements inside the root', () => {
    const { editor, controller, root, addHost } = mount();
    addHost('a');
    const shell = document.createElement('div');
    shell.tabIndex = -1;
    const button = document.createElement('button');
    root.append(shell, button);
    controller.registerBlockElement('b', shell);
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('b')));
    const backspace = () => new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true, bubbles: true });
    const stray = backspace();
    button.dispatchEvent(stray);
    expect(stray.defaultPrevented).toBe(false);
    expect(editor.getBlocks()).toHaveLength(2);
    const handled = backspace();
    shell.dispatchEvent(handled);
    expect(handled.defaultPrevented).toBe(true);
    expect(editor.getBlocks().map((block) => block.id)).toEqual(['a']);
  });
});
