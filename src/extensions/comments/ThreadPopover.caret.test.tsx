import { act, screen } from '@testing-library/react';
import { paragraph } from '../../blocks/void/test-canvas';
import { replaceInlineStep } from '../../engine';
import { mountComments, span, thread } from './comments-test-canvas';

const blocks = () => [paragraph('a', `Say ${span('t1', 'hello')} to ${span('t2', `the ${span('t3', 'world')}`)}`)];
const threads = () => [thread('t1', 'Hi'), thread('t2', 'Outer'), thread('t3', 'Inner')];

function openedByClick() {
  const canvas = mountComments(blocks(), threads());
  canvas.caret('a', 6);
  canvas.click(canvas.anchor('t1'));
  return canvas;
}

function removeHello(canvas: ReturnType<typeof openedByClick>) {
  const { editor } = canvas.handle();
  act(() => editor.dispatch(editor.createTransaction().setOrigin('remote').step(replaceInlineStep('a', 'text', 4, 9, []))));
}

describe('a thread a click opened', () => {
  it('stays open while the writer moves the caret within its text, and closes once they move it out', () => {
    const canvas = openedByClick();
    canvas.moveCaret('a', 8);
    canvas.moveCaret('a', 9);
    expect(canvas.popover('Comment on "hello"')).not.toBeNull();
    canvas.moveCaret('a', 12);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stays open when a collaborator or your code moves the caret out of its text', () => {
    const canvas = openedByClick();
    canvas.moveCaret('a', 1, 'remote');
    canvas.moveCaret('a', 1, 'ai');
    canvas.moveCaret('a', 1, 'command');
    expect(canvas.popover('Comment on "hello"')).not.toBeNull();
  });

  it('once its text is gone, stays open through a selection your code sets and closes on the next move of the writer', () => {
    const canvas = openedByClick();
    removeHello(canvas);
    expect(canvas.popover('Text removed')).not.toBeNull();
    canvas.moveCaret('a', 2, 'ai');
    canvas.moveCaret('a', 3, 'command');
    expect(canvas.popover('Text removed')).not.toBeNull();
    canvas.moveCaret('a', 1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['history', 'drop'] as const)('closes on a caret move of %s, which the writer made', (origin) => {
    const opened = openedByClick();
    opened.moveCaret('a', 12, origin);
    expect(screen.queryByRole('dialog')).toBeNull();
    const removed = openedByClick();
    removeHello(removed);
    removed.moveCaret('a', 1, origin);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('once its text is gone, stays open when your code focuses the canvas elsewhere', () => {
    const canvas = openedByClick();
    removeHello(canvas);
    act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 1 }));
    expect(canvas.popover('Text removed')).not.toBeNull();
  });

  it('opened on overlapping anchors, stays open while the caret is in any of them', () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 20);
    canvas.click(canvas.anchor('t3'));
    expect(canvas.popover('Comments on this text')).not.toBeNull();
    canvas.moveCaret('a', 15);
    expect(canvas.popover('Comments on this text')).not.toBeNull();
    canvas.moveCaret('a', 2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
