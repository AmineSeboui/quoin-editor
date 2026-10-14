import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { textSelection } from '../../engine/state/selection';
import { toggleMark } from '../../engine/commands/marks';
import { at, cleanUpAfterTest, detachAfterTest, mountController, nextTask } from './test-controller';
import { ViewController } from './view-controller';

afterEach(cleanUpAfterTest);

describe('ViewController selection sync', () => {
  it('reads the DOM selection into the model', () => {
    const { controller, editor, host } = mountController();
    document.getSelection()!.setBaseAndExtent(host.firstChild!, 1, host.firstChild!, 1);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toMatchObject({ head: { block: 'a', offset: 1 } });
  });

  it('leaves the DOM selection alone while focus is in a control outside the editor', () => {
    const { controller, editor } = mountController();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(editor.state.selection).toEqual(textSelection(at(1)));
    expect(sel.rangeCount).toBe(0);
  });

  it('keeps the model selection while a control outside the editor has focus', async () => {
    const { controller, editor, host } = mountController('hello');
    const button = document.createElement('button');
    document.body.appendChild(button);
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1), at(4))));
    button.focus();
    document.getSelection()!.setBaseAndExtent(host.firstChild!, 1, host.firstChild!, 4);
    await nextTask();
    controller.run(toggleMark('bold'));
    document.dispatchEvent(new Event('selectionchange'));
    await nextTask();
    expect(host.innerHTML).toBe('h<strong>ell</strong>o');
    expect(editor.state.selection).toEqual(textSelection(at(1), at(4)));
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
    detachAfterTest(controller.attach(root));
    const unregister = controller.registerBlockElement('d', shell);
    expect(controller.blockElement('d')).toBe(shell);
    document.getSelection()!.collapse(shell, 1);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toEqual({ kind: 'node', block: 'd' });
    unregister();
    expect(controller.blockElement('d')).toBeUndefined();
  });

  it('maps the DOM selection without re-rendering the host or writing the selection back', () => {
    const { controller, editor, host } = mountController();
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
    const { controller, editor, host, root } = mountController();
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
    const { controller, editor, host } = mountController();
    const read = vi.spyOn(controller, 'readSelectionFromDom');
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    await nextTask();
    expect(read).not.toHaveBeenCalled();
    document.getSelection()!.collapse(host.firstChild!, 2);
    await nextTask();
    expect(read).toHaveBeenCalledTimes(1);
    expect(editor.state.selection).toEqual(textSelection(at(2)));
  });
});
