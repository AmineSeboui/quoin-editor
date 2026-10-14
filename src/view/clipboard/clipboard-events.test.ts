import { describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { handleCopy, handlePaste } from './clipboard-events';

function fakeClipboard(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  let prevented = false;
  const event = {
    clipboardData: { getData: (t: string) => data.get(t) ?? '', setData: (t: string, v: string) => data.set(t, v), files: [] as File[], types: [...data.keys()] },
    preventDefault: () => (prevented = true),
  } as unknown as ClipboardEvent;
  return { event, data, prevented: () => prevented };
}

describe('clipboard events', () => {
  const setup = () => {
    const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'one **two**' } }] });
    const controller = new ViewController({ editor });
    return { editor, controller };
  };
  const range = (from: number, to: number) => textSelection({ block: 'a', region: 'text', offset: from }, { block: 'a', region: 'text', offset: to });

  it('writes three flavours on copy and deletes on cut', () => {
    const { editor, controller } = setup();
    controller.dispatch(editor.createTransaction().setSelection(range(4, 7)));
    const copy = fakeClipboard();
    handleCopy(controller, copy.event, false);
    expect(copy.prevented()).toBe(true);
    expect(copy.data.get('text/plain')).toBe('two');
    expect(JSON.parse(copy.data.get('application/x-quoin+json')!)).toMatchObject({ quoin: 1 });
    const cut = fakeClipboard();
    handleCopy(controller, cut.event, true);
    expect(editor.getBlocks()[0].data.markdown).toBe('one&#32;');
  });

  it('pastes HTML from outside and prefers the embedded slice', () => {
    const { editor, controller } = setup();
    controller.dispatch(editor.createTransaction().setSelection(range(3, 3)));
    handlePaste(controller, fakeClipboard({ 'text/html': '<p><em>x</em></p>', 'text/plain': 'x' }).event);
    expect(editor.getBlocks()[0].data.markdown).toBe('one*x* **two**');
  });

  it('leaves an empty selection copy alone', () => {
    const { editor, controller } = setup();
    controller.dispatch(editor.createTransaction().setSelection(range(1, 1)));
    const copy = fakeClipboard();
    handleCopy(controller, copy.event, false);
    expect(copy.prevented()).toBe(false);
  });
});
