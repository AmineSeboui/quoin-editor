import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { nodeSelection, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { Editor, md } from '../react/test-harness';
import { handleKeydown } from './keydown';

describe('a caret on the upstream side at the start of a block', () => {
  afterEach(() => Reflect.deleteProperty(Range.prototype, 'getClientRects'));

  it.each([
    ['ArrowDown', 'a'],
    ['ArrowUp', 'b'],
  ])('is moved by %s like any caret there', (name, block) => {
    Range.prototype.getClientRects = () => [new DOMRect(0, 0, 1, 10)] as unknown as DOMRectList;
    let controller!: ViewController;
    const blocks = [md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'two')];
    render(createElement(Editor, { options: { blocks, onChange: () => {} }, onController: (c) => (controller = c) }));
    const { editor } = controller;
    const caret = { ...textSelection({ block, region: 'text', offset: 0 }), assoc: -1 as const };
    act(() => controller.dispatch(editor.createTransaction().setSelection(caret)));
    const event = new KeyboardEvent('keydown', { key: name, cancelable: true, bubbles: true });
    act(() => handleKeydown(controller, event));
    expect([event.defaultPrevented, editor.state.selection]).toEqual([true, nodeSelection('d')]);
  });
});
