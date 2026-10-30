import { afterEach, describe, expect, it, vi } from 'vitest';
import { insertText } from '../../engine/commands/insert-text';
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

  it('never reads its own renders back, even when the model moves on before their records arrive', async () => {
    const { editor, controller, root, addHost, text } = mount();
    addHost('a');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    controller.run(insertText('!'));
    insertText('?')(editor.state, (tr) => editor.dispatch(tr));
    await nextTask();
    expect(text(0)).toBe('hi!?');
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

  it('ignores a beforeinput that belongs to a composition before reading anything from the DOM', () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    const read = vi.spyOn(controller, 'readSelectionFromDom');
    const composing = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', isComposing: true, cancelable: true, bubbles: true });
    host.dispatchEvent(composing);
    controller.composingKey = 'a:text';
    const during = beforeInput('y');
    host.dispatchEvent(during);
    controller.composingKey = null;
    expect([composing, during].map((event) => event.defaultPrevented)).toEqual([false, false]);
    expect(read).not.toHaveBeenCalled();
    expect(text(0)).toBe('hi');
    host.dispatchEvent(beforeInput('z'));
    expect(read).toHaveBeenCalledTimes(1);
    expect(text(0)).toBe('hiz');
  });
});

describe('detaching during a composition', () => {
  const compose = (target: HTMLElement, phase: 'start' | 'end', data = '') =>
    target.dispatchEvent(new CompositionEvent(`composition${phase}`, { data, bubbles: true }));

  it('lets go of a composition that is still running, so the controller takes input again', async () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    const detach = controller.attach(root);
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    document.getSelection()!.collapse(host.firstChild, 2);
    compose(host, 'start');
    expect(controller.composingKey).not.toBeNull();
    detach();
    expect(controller.composingKey).toBeNull();
    await nextTask();
    expect(text(0)).toBe('hi');
    detachers.push(controller.attach(root));
    host.dispatchEvent(beforeInput('!'));
    expect(text(0)).toBe('hi!');
  });

  it('commits a composition that had already ended, then lets go', async () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    const detach = controller.attach(root);
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    document.getSelection()!.collapse(host.firstChild, 2);
    compose(host, 'start');
    type(host, 'hi\u65e5');
    compose(host, 'end', '\u65e5');
    detach();
    expect(controller.composingKey).toBeNull();
    expect(text(0)).toBe('hi\u65e5');
    await nextTask();
    expect(text(0)).toBe('hi\u65e5');
  });

  it('lets go of a composition in the sink', async () => {
    const { editor, controller, root, addHost } = mount();
    addHost('a');
    const sink = document.createElement('div');
    root.appendChild(sink);
    controller.registerSink(sink);
    const detach = controller.attach(root);
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 0 })));
    compose(sink, 'start');
    expect(controller.composingKey).not.toBeNull();
    detach();
    expect(controller.composingKey).toBeNull();
    await nextTask();
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['hi', 'yo']);
  });
});

describe('a third-party edit during a composition', () => {
  const compose = (target: HTMLElement, phase: 'start' | 'end', data = '') =>
    target.dispatchEvent(new CompositionEvent(`composition${phase}`, { data, bubbles: true }));

  it('reaches the model once the composition in another host ends', async () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    const other = addHost('b');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    document.getSelection()!.collapse(host.firstChild, 2);
    compose(host, 'start');
    (other.firstChild as Text).data = 'yo!';
    await nextTask();
    expect(text(1)).toBe('yo');
    type(host, 'hi日');
    compose(host, 'end', '日');
    await nextTask();
    expect([text(0), text(1)]).toEqual(['hi日', 'yo!']);
    expect(editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 3 }));
  });

  it('reaches the model when it lands after compositionend, before the composition settles', async () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    const other = addHost('b');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
    document.getSelection()!.collapse(host.firstChild, 2);
    compose(host, 'start');
    type(host, 'hi\u65e5');
    compose(host, 'end', '\u65e5');
    (other.firstChild as Text).data = 'yo!';
    await nextTask();
    await nextTask();
    expect([text(0), text(1)]).toEqual(['hi\u65e5', 'yo!']);
    expect(editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 3 }));
  });

  it('leaves the caret in the composing block when the composition commits nothing', async () => {
    const { editor, controller, root, addHost, text } = mount();
    const host = addHost('a');
    const other = addHost('b');
    detachers.push(controller.attach(root));
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 1 })));
    document.getSelection()!.collapse(host.firstChild, 1);
    compose(host, 'start');
    (other.firstChild as Text).data = 'yo!';
    compose(host, 'end');
    await nextTask();
    expect([text(0), text(1)]).toEqual(['hi', 'yo!']);
    expect(editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 1 }));
  });
});
