import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { nodeSelection, removeBlocksStep, type QuoinBlock, type TransactionOrigin } from '../../engine';
import { Editor, md } from '../react/test-harness';
import type { ViewController } from './view-controller';

const divider = (id: string): QuoinBlock => ({ id, type: 'DIVIDER', data: {} });
const blocks = [md('a', 'hello'), divider('d1'), divider('d2'), md('c', 'world'), md('e', 'end')];
const SCROLLED = 500;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

const scrollable = (element: HTMLElement) => {
  const scrollTo = (options: ScrollToOptions) => void (element.scrollTop = options.top ?? 0);
  element.scrollTo = scrollTo as typeof element.scrollTo;
  return element;
};

// jsdom neither lays out nor scrolls, so a host's focus() scrolls the scroller to the top here, as a browser would to
// bring it into view. A reveal is only counted, since one that scrolls smoothly would move the page after any check.
function mountScrolled(where: 'around' | 'root') {
  const around = scrollable(document.createElement('div'));
  document.body.appendChild(around);
  let controller!: ViewController;
  render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />, {
    container: around.appendChild(document.createElement('div')),
  });
  const scroller = where === 'root' ? scrollable(controller.root!) : around;
  const reveals = vi.spyOn(Element.prototype, 'scrollIntoView');
  const focus = HTMLElement.prototype.focus;
  const focuses = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options) {
    focus.call(this, options);
    if (options?.preventScroll !== true) scroller.scrollTop = 0;
  });
  const removal = (id: string, origin: TransactionOrigin) => {
    const { editor } = controller;
    const tr = editor.createTransaction().setOrigin(origin).setMeta('addToHistory', false);
    editor.dispatch(tr.step(removeBlocksStep(editor.state.doc.index.get(id)!, 1)));
  };
  const remove = (id: string, origin: TransactionOrigin) => act(() => removal(id, origin));
  const selectNode = (id: string) => {
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection(id))));
    reveals.mockClear();
  };
  return { controller, scroller, reveals, focuses, remove, removal, selectNode };
}

describe.each(['around', 'root'] as const)('a change from outside, the scroller being %s the canvas,', (where) => {
  it.each([
    ['remote', 0],
    ['command', 1],
  ] as const)('that removes the selected block selects the next, a %s change revealing it %i times', (origin, n) => {
    const { controller, reveals, selectNode, remove } = mountScrolled(where);
    act(() => controller.focus());
    selectNode('d1');
    remove('d1', origin);
    expect(controller.editor.state.selection).toEqual(nodeSelection('d2'));
    expect(reveals).toHaveBeenCalledTimes(n);
  });

  it.each([
    ['remote', SCROLLED],
    ['command', 0],
  ] as const)('that removes the caret block focuses the next, a %s change leaving it at %i', (origin, at) => {
    const { controller, scroller, focuses, remove } = mountScrolled(where);
    act(() => controller.focus({ block: 'c', region: 'text', offset: 2 }));
    scroller.scrollTop = SCROLLED;
    focuses.mockClear();
    remove('c', origin);
    expect(controller.editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'e' } });
    expect(document.activeElement?.closest('[data-block-id="e"]')).not.toBeNull();
    expect(scroller.scrollTop).toBe(at);
    expect(focuses.mock.calls.map(([options]) => options?.preventScroll)).toEqual([origin === 'remote']);
  });
});

describe('a remote change followed by others before the canvas draws it', () => {
  it('scrolls nothing for the render it causes', () => {
    const { controller, scroller, reveals, removal, selectNode } = mountScrolled('around');
    const followUp = () => {
      const { editor } = controller;
      editor.dispatch(editor.createTransaction().setSelection(editor.state.selection).setMeta('presence', true));
    };
    act(() => controller.focus());
    selectNode('d1');
    act(() => {
      removal('d1', 'remote');
      followUp();
    });
    expect(controller.editor.state.selection).toEqual(nodeSelection('d2'));
    expect(reveals).not.toHaveBeenCalled();
    act(() => controller.focus({ block: 'c', region: 'text', offset: 2 }));
    scroller.scrollTop = SCROLLED;
    act(() => {
      removal('c', 'remote');
      followUp();
    });
    expect(document.activeElement?.closest('[data-block-id="e"]')).not.toBeNull();
    expect(scroller.scrollTop).toBe(SCROLLED);
  });

  it('scrolls again for a later change from elsewhere, once that render is drawn', () => {
    const { controller, scroller, remove } = mountScrolled('around');
    act(() => controller.focus({ block: 'c', region: 'text', offset: 2 }));
    remove('a', 'remote');
    scroller.scrollTop = SCROLLED;
    remove('c', 'command');
    expect(scroller.scrollTop).toBe(0);
  });
});

describe('a block selected by a change of a collaborator, without bringing it into view,', () => {
  it('comes into view on the next change made here that leaves it selected', () => {
    const { controller, reveals, selectNode, remove } = mountScrolled('around');
    act(() => controller.focus());
    selectNode('d1');
    remove('d1', 'remote');
    expect(reveals).not.toHaveBeenCalled();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('d2'))));
    expect(reveals).toHaveBeenCalledTimes(1);
  });

  it('stays where it is through the caret moves and changes of collaborators that follow', () => {
    const { controller, reveals, selectNode, remove } = mountScrolled('around');
    act(() => controller.focus());
    selectNode('d1');
    remove('d1', 'remote');
    act(() => {
      const { editor } = controller;
      editor.dispatch(editor.createTransaction().setOrigin('remote').setMeta('presence', true));
    });
    remove('a', 'remote');
    expect(controller.editor.state.selection).toEqual(nodeSelection('d2'));
    expect(reveals).not.toHaveBeenCalled();
  });
});

describe('a block selected and left in place by changes of collaborators', () => {
  const outsideChange = (controller: ViewController) =>
    act(() => {
      const { editor } = controller;
      editor.dispatch(editor.createTransaction().setMeta('unfurl', true).setMeta('addToHistory', false));
    });

  it('stays where it is through a change from elsewhere, and comes into view with the next change made here', () => {
    const { controller, reveals, selectNode, remove } = mountScrolled('around');
    act(() => controller.focus());
    selectNode('d1');
    remove('d1', 'remote');
    outsideChange(controller);
    expect(reveals).not.toHaveBeenCalled();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('d2'))));
    expect(reveals).toHaveBeenCalledTimes(1);
  });

  it('stays where it is when focus comes back to the canvas', () => {
    const { controller, reveals, selectNode, remove } = mountScrolled('around');
    act(() => controller.focus());
    selectNode('d1');
    remove('d1', 'remote');
    const active = document.activeElement!;
    act(() => void active.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null })));
    expect(reveals).not.toHaveBeenCalled();
  });

  it('is not brought back into view by a change from elsewhere after a caret move of a collaborator', () => {
    const { controller, reveals, selectNode } = mountScrolled('around');
    act(() => controller.focus());
    selectNode('d1');
    act(() => {
      const { editor } = controller;
      editor.dispatch(editor.createTransaction().setOrigin('remote').setMeta('presence', true));
    });
    outsideChange(controller);
    expect(controller.editor.state.selection).toEqual(nodeSelection('d1'));
    expect(reveals).not.toHaveBeenCalled();
  });
});

describe('the caret move of a collaborator drawn in the same render as a command', () => {
  it('leaves the command to bring the block it selects into view', () => {
    const { controller, reveals } = mountScrolled('around');
    act(() => controller.focus());
    reveals.mockClear();
    act(() => {
      const { editor } = controller;
      editor.dispatch(editor.createTransaction().setOrigin('remote').setMeta('presence', true));
      editor.dispatch(editor.createTransaction().setSelection(nodeSelection('d2')));
    });
    expect(controller.editor.state.selection).toEqual(nodeSelection('d2'));
    expect(reveals).toHaveBeenCalledTimes(1);
  });
});
