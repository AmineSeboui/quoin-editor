import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import type { BlockRenderer } from '../react/block-renderer-types';
import { defaultRenderers } from '../react/default-renderers';
import { Editor, md } from '../react/test-harness';

const at = (block: string) => textSelection({ block, region: 'text', offset: 0 });

const Markdown = defaultRenderers.MARKDOWN;
const StaticSecond: BlockRenderer = (props) =>
  props.block.id === 'b' ? <p contentEditable={false}>drawn without a region</p> : <Markdown {...props} />;

afterEach(() => document.body.replaceChildren());

function mount() {
  let controller!: ViewController;
  const options = { blocks: [md('a', ''), md('b', 'hidden text'), md('c', '')], onChange: () => {} };
  const view = { renderers: { MARKDOWN: StaticSecond } };
  render(createElement(Editor, { options, view, onController: (c: ViewController) => (controller = c) }));
  const select = (block: string) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(at(block))));
  const press = (key: string) => {
    act(() => handleKeydown(controller, new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true })));
    return controller.editor.state.selection;
  };
  return { controller, select, press };
}

describe('a text block whose host renderer draws no editable region', () => {
  it('is passed over by ArrowUp and ArrowDown', () => {
    const { select, press } = mount();
    select('a');
    expect(press('ArrowDown')).toEqual(at('c'));
    expect(press('ArrowUp')).toEqual(at('a'));
  });

  it('is selected as a whole when pressed', () => {
    const { controller, select } = mount();
    select('a');
    const drawn = screen.getByText('drawn without a region');
    act(() => void drawn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 })));
    expect(controller.editor.state.selection).toEqual({ kind: 'blocks', anchor: 'b', head: 'b' });
  });
});
