import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import type { Extension } from '../../engine/extension/types';
import { textSelection } from '../../engine/state/selection';
import { insertText } from '../../engine/commands/insert-text';
import { hostKey } from './host-registry';
import { at, cleanUpAfterTest, mountController } from './test-controller';
import { ViewController } from './view-controller';

afterEach(cleanUpAfterTest);

describe('ViewController', () => {
  it('renders a host and re-renders it after a dispatch, restoring the caret', () => {
    const { controller, editor, host } = mountController();
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
    const { controller, editor } = mountController();
    controller.goalX = 40;
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(controller.goalX).toBe(40);
    controller.run(insertText('!'));
    expect(controller.goalX).toBeNull();
  });

  it('focuses the host of the target and writes the selection there', () => {
    const { controller, editor, host } = mountController();
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

  it('applies read-only to the registered hosts', () => {
    const { controller, host } = mountController();
    expect(controller.readOnly).toBe(false);
    controller.setReadOnly(true);
    expect(controller.readOnly).toBe(true);
    expect(host.contentEditable).toBe('false');
    controller.setReadOnly(false);
    expect(host.contentEditable).toBe('true');
    expect(new ViewController({ editor: createEditor({ blocks: [] }), readOnly: true }).readOnly).toBe(true);
  });

  it('tells subscribers when read-only changes, and only then', () => {
    const { controller } = mountController();
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

  it('leaves the composing host and the DOM selection alone until the composition is over', () => {
    const { controller, editor, host } = mountController();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    const sel = document.getSelection()!;
    sel.collapse(host.firstChild!, 0);
    controller.composingKey = hostKey('a', 'text');
    controller.run(insertText('!'));
    expect(host.textContent).toBe('hi');
    expect([sel.anchorNode, sel.anchorOffset]).toEqual([host.firstChild, 0]);
    controller.readSelectionFromDom();
    expect(editor.state.selection).toEqual(textSelection(at(2)));
    controller.composingKey = null;
    controller.renderHost('a', 'text');
    expect(host.textContent).toBe('h!i');
  });

  it('moves focus to the host the selection moves into while the editor has focus', () => {
    const editor = createEditor({
      blocks: [
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'hi' } },
        { id: 'b', type: 'MARKDOWN', data: { markdown: 'yo' } },
      ],
    });
    const controller = new ViewController({ editor });
    const [a, b] = ['a', 'b'].map((id) => {
      const host = document.createElement('div');
      host.tabIndex = -1;
      document.body.appendChild(host);
      controller.registry.register(id, 'text', host);
      controller.renderHost(id, 'text');
      return host;
    });
    a.focus();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(0, 'b'))));
    expect(document.activeElement).toBe(b);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    expect(document.activeElement).toBe(input);
  });
});
