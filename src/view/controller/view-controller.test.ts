import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import type { Extension } from '../../engine/extension/types';
import { textSelection } from '../../engine/state/selection';
import { insertText } from '../../engine/commands/insert-text';
import { ViewController } from './view-controller';

const detachers: (() => void)[] = [];

afterEach(() => {
  detachers.splice(0).forEach((detach) => detach());
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

function mount() {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'hi' } }] });
  const controller = new ViewController({ editor });
  const root = document.createElement('div');
  const host = document.createElement('div');
  host.contentEditable = 'true';
  root.appendChild(host);
  document.body.appendChild(root);
  detachers.push(controller.attach(root));
  controller.registry.register('a', 'text', host);
  controller.renderHost('a', 'text');
  return { controller, editor, host, root };
}

const at = (offset: number, block = 'a') => ({ block, region: 'text', offset });
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ViewController', () => {
  it('renders a host and re-renders it after a dispatch, restoring the caret', () => {
    const { controller, editor, host } = mount();
    expect(host.textContent).toBe('hi');
    controller.run((state, dispatch) => {
      dispatch!(editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 2 })));
      return true;
    });
    controller.run(insertText('!'));
    expect(host.textContent).toBe('hi!');
    const sel = document.getSelection()!;
    expect(sel.anchorNode?.textContent).toBe('hi!');
    expect(sel.anchorOffset).toBe(3);
  });

  it('reads the DOM selection into the model', () => {
    const { controller, editor, host } = mount();
    document.getSelection()!.setBaseAndExtent(host.firstChild!, 1, host.firstChild!, 1);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toMatchObject({ head: { block: 'a', offset: 1 } });
  });

  it('runs dispatches inside the flush function', () => {
    const editor = createEditor({ blocks: [] });
    let flushed = 0;
    const controller = new ViewController({ editor, flush: (fn) => { flushed += 1; fn(); } });
    controller.run(insertText('a'));
    expect(flushed).toBe(1);
  });

  it('renders only the hosts whose content or decorations changed', () => {
    const hit: Extension = {
      name: 'hit',
      decorations: ({ selection }) =>
        selection?.kind === 'text' && selection.head.block === 'a' && selection.head.offset === 1
          ? [{ kind: 'inline', block: 'a', region: 'text', from: 0, to: 1, attrs: { class: 'hit' } }]
          : [],
    };
    const editor = createEditor({
      blocks: [
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'hi' } },
        { id: 'b', type: 'MARKDOWN', data: { markdown: 'yo' } },
      ],
      extensions: [...coreExtensions(), hit],
    });
    const controller = new ViewController({ editor });
    const [a, b] = ['a', 'b'].map((id) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      controller.registry.register(id, 'text', host);
      controller.renderHost(id, 'text');
      return host;
    });
    const stray = document.createElement('i');
    b.appendChild(stray);
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(a.querySelector('.hit')?.textContent).toBe('h');
    controller.run(insertText('!'));
    expect(a.innerHTML).toBe('h!i');
    expect(b.lastChild).toBe(stray);
  });

  it('resets the goal column when the document changes', () => {
    const { controller, editor } = mount();
    controller.goalX = 40;
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(controller.goalX).toBe(40);
    controller.run(insertText('!'));
    expect(controller.goalX).toBeNull();
  });

  it('focuses the host of the target and writes the selection there', () => {
    const { controller, editor, host } = mount();
    host.tabIndex = -1;
    const sel = document.getSelection()!;
    controller.focus('end');
    expect(document.activeElement).toBe(host);
    expect(editor.state.selection).toEqual(textSelection(at(2)));
    expect([sel.anchorNode, sel.anchorOffset]).toEqual([host.firstChild, 2]);
    controller.focus(at(1));
    expect([sel.anchorNode, sel.anchorOffset]).toEqual([host.firstChild, 1]);
    controller.focus('start');
    expect(editor.state.selection).toEqual(textSelection(at(0)));
    host.blur();
    controller.focus();
    expect(document.activeElement).toBe(host);
    expect(editor.state.selection).toEqual(textSelection(at(0)));
  });

  it('leaves the DOM selection alone while focus is in a control outside the editor', () => {
    const { controller, editor } = mount();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(editor.state.selection).toEqual(textSelection(at(1)));
    expect(sel.rangeCount).toBe(0);
  });

  it('reads a selection inside a void block element as a node selection', () => {
    const editor = createEditor({
      blocks: [
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'hi' } },
        { id: 'd', type: 'DIVIDER', data: {} },
      ],
    });
    const controller = new ViewController({ editor });
    const root = document.createElement('div');
    const shell = document.createElement('div');
    shell.appendChild(document.createElement('hr'));
    root.appendChild(shell);
    document.body.appendChild(root);
    detachers.push(controller.attach(root));
    const unregister = controller.registerBlockElement('d', shell);
    expect(controller.blockElement('d')).toBe(shell);
    document.getSelection()!.collapse(shell, 1);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toEqual({ kind: 'node', block: 'd' });
    unregister();
    expect(controller.blockElement('d')).toBeUndefined();
  });

  it('maps the DOM selection without re-rendering the host or writing the selection back', () => {
    const { controller, editor, host } = mount();
    const stray = document.createElement('i');
    host.appendChild(stray);
    const sel = document.getSelection()!;
    sel.collapse(host, 1);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toEqual(textSelection(at(2)));
    expect(host.lastChild).toBe(stray);
    expect([sel.anchorNode, sel.anchorOffset]).toEqual([host, 1]);
  });

  it('follows selection changes while attached and stops when detached', async () => {
    const { controller, editor, host, root } = mount();
    const detach = controller.attach(root);
    const sel = document.getSelection()!;
    sel.collapse(host.firstChild!, 1);
    await nextTask();
    expect(editor.state.selection).toEqual(textSelection(at(1)));
    detach();
    expect(controller.root).toBeNull();
    sel.collapse(host.firstChild!, 2);
    await nextTask();
    expect(editor.state.selection).toEqual(textSelection(at(1)));
  });

  it('ignores the selection change its own write causes', async () => {
    const { controller, editor, host } = mount();
    const read = vi.spyOn(controller, 'readSelectionFromDom');
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    await nextTask();
    expect(read).not.toHaveBeenCalled();
    document.getSelection()!.collapse(host.firstChild!, 2);
    await nextTask();
    expect(read).toHaveBeenCalledTimes(1);
    expect(editor.state.selection).toEqual(textSelection(at(2)));
  });

  it('applies read-only to the registered hosts', () => {
    const { controller, host } = mount();
    expect(controller.readOnly).toBe(false);
    controller.setReadOnly(true);
    expect(controller.readOnly).toBe(true);
    expect(host.contentEditable).toBe('false');
    controller.setReadOnly(false);
    expect(host.contentEditable).toBe('true');
    expect(new ViewController({ editor: createEditor({ blocks: [] }), readOnly: true }).readOnly).toBe(true);
  });

  it('tells subscribers when read-only changes, and only then', () => {
    const { controller } = mount();
    const listener = vi.fn();
    const stop = controller.subscribeReadOnly(listener);
    controller.setReadOnly(false);
    expect(listener).not.toHaveBeenCalled();
    controller.setReadOnly(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.readOnly).toBe(true);
    stop();
    controller.setReadOnly(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
