import { afterEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import type { QuoinBlock, Selection } from '../../engine';
import { nodeSelection, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import type { BlockRenderer } from '../react/block-renderer-types';
import { EditableRegion } from '../react/EditableRegion';
import { Editor, md } from '../react/test-harness';
import { NODE_ENTRY } from './node-entry';

const at = (block: string, offset: number, region = 'text') => ({ block, region, offset });
const image = (caption: string): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: '', caption } });

const captioned =
  (marked: boolean): BlockRenderer =>
  ({ block }) => (
    <div contentEditable={false} {...(marked ? { [NODE_ENTRY]: '' } : {})}>
      <span>picture</span>
      <EditableRegion block={block.id} region="caption" label="Caption" />
    </div>
  );

afterEach(() => document.body.replaceChildren());

function mount(blocks: QuoinBlock[], marked = true) {
  let controller!: ViewController;
  const options = { blocks, onChange: () => {} };
  const view = { renderers: { IMAGE: captioned(marked) } };
  render(createElement(Editor, { options, view, onController: (c: ViewController) => (controller = c) }));
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  const press = (name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, cancelable: true, bubbles: true });
    act(() => handleKeydown(controller, event));
    return controller.editor.state.selection;
  };
  return { select, press };
}

describe('a block drawn as a whole around its text', () => {
  it('is selected as a node when the arrows arrive at it from either side', () => {
    const { select, press } = mount([md('a', ''), image(''), md('b', '')]);
    select(textSelection(at('a', 0)));
    expect(press('ArrowDown')).toEqual(nodeSelection('i'));
    select(textSelection(at('b', 0)));
    expect(press('ArrowUp')).toEqual(nodeSelection('i'));
    select(textSelection(at('a', 0)));
    expect(press('ArrowRight')).toEqual(nodeSelection('i'));
    select(textSelection(at('b', 0)));
    expect(press('ArrowLeft')).toEqual(nodeSelection('i'));
  });

  it('is selected as a node when the caret leaves its text towards its start', () => {
    const { select, press } = mount([md('a', ''), image('cap'), md('b', '')]);
    select(textSelection(at('i', 0, 'caption')));
    expect(press('ArrowLeft')).toEqual(nodeSelection('i'));
    select(textSelection(at('i', 3, 'caption')));
    expect(press('ArrowRight')).toEqual(textSelection(at('b', 0)));
  });

  it('is selected as a node by Up from the first line of its text, and left for the next block by Down', () => {
    const { select, press } = mount([md('a', ''), image(''), md('b', '')]);
    select(textSelection(at('i', 0, 'caption')));
    expect(press('ArrowUp')).toEqual(nodeSelection('i'));
    select(textSelection(at('i', 0, 'caption')));
    expect(press('ArrowDown')).toEqual(textSelection(at('b', 0)));
  });

  it('takes the caret into its text from the arrows when it is not marked', () => {
    const { select, press } = mount([md('a', ''), image(''), md('b', '')], false);
    select(textSelection(at('a', 0)));
    expect(press('ArrowDown')).toEqual(textSelection(at('i', 0, 'caption')));
    expect(press('ArrowUp')).toEqual(textSelection(at('a', 0)));
  });
});
