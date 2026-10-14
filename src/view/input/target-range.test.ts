import { afterEach, describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { targetBeyondSelection } from './target-range';

afterEach(() => document.body.replaceChildren());

function setup() {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'one two three' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'next' } },
    ],
  });
  const controller = new ViewController({ editor });
  const hosts = ['a', 'b'].map((id) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    controller.registry.register(id, 'text', host);
    controller.renderHost(id, 'text');
    return host;
  });
  const at = (block: string, offset: number) => ({ block, region: 'text', offset });
  const select = (anchor: ReturnType<typeof at>, head = anchor) =>
    controller.dispatch(editor.createTransaction().setSelection(textSelection(anchor, head)));
  const event = (ranges: [Node, number, Node, number][]) => {
    const input = new InputEvent('beforeinput', { inputType: 'deleteContentForward', cancelable: true });
    const list = ranges.map(([startContainer, startOffset, endContainer, endOffset]) => ({
      startContainer,
      startOffset,
      endContainer,
      endOffset,
    }));
    Object.defineProperty(input, 'getTargetRanges', { value: () => list });
    return input;
  };
  return { editor, controller, hosts, at, select, event };
}

describe('targetBeyondSelection', () => {
  it('is null when the browser gives no target range, or an empty one', () => {
    const { controller, hosts, select, at, event } = setup();
    select(at('a', 3));
    const bare = new InputEvent('beforeinput', { inputType: 'deleteContentForward' });
    expect(targetBeyondSelection(controller, bare)).toBeNull();
    const text = hosts[0].firstChild!;
    expect(targetBeyondSelection(controller, event([[text, 5, text, 5]]))).toBeNull();
    expect(targetBeyondSelection(controller, event([]))).toBeNull();
  });

  it('is the range when it differs from the selection', () => {
    const { controller, hosts, select, at, event } = setup();
    select(at('a', 3));
    const text = hosts[0].firstChild!;
    expect(targetBeyondSelection(controller, event([[text, 3, text, 7]]))).toEqual({ from: at('a', 3), to: at('a', 7) });
  });

  it('is null when the range is the selection, whichever way the selection points', () => {
    const { controller, hosts, select, at, event } = setup();
    const text = hosts[0].firstChild!;
    select(at('a', 4), at('a', 7));
    expect(targetBeyondSelection(controller, event([[text, 4, text, 7]]))).toBeNull();
    select(at('a', 7), at('a', 4));
    expect(targetBeyondSelection(controller, event([[text, 4, text, 7]]))).toBeNull();
  });

  it('is the range when the selection is another range, a block range or reaches into another block', () => {
    const { controller, hosts, editor, select, at, event } = setup();
    const text = hosts[0].firstChild!;
    const target = event([[text, 4, text, 7]]);
    select(at('a', 4), at('a', 8));
    expect(targetBeyondSelection(controller, target)).toEqual({ from: at('a', 4), to: at('a', 7) });
    select(at('a', 4), at('b', 2));
    expect(targetBeyondSelection(controller, target)).toEqual({ from: at('a', 4), to: at('a', 7) });
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a', 'b')));
    expect(targetBeyondSelection(controller, target)).toEqual({ from: at('a', 4), to: at('a', 7) });
  });
});
