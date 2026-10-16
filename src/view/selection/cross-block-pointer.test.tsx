import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { nodeSelection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import type { BlockRenderProps } from '../react/default-renderers';
import { Editor, md } from '../react/test-harness';
import { NATIVE_INTERACTION } from './native-interaction';

const Widget = ({ block }: BlockRenderProps) => (
  <div contentEditable={false} {...(block.id === 'native' ? { [NATIVE_INTERACTION]: '' } : {})}>
    <span>{`inside ${block.id}`}</span>
  </div>
);

const blocks = [md('a', 'one'), { id: 'plain', type: 'WIDGET', data: {} }, { id: 'native', type: 'WIDGET', data: {} }];

function mount() {
  let controller!: ViewController;
  render(
    <Editor
      options={{ blocks, onChange: () => {} }}
      view={{ renderers: { WIDGET: Widget } }}
      onController={(c) => (controller = c)}
    />,
  );
  return controller;
}

const fire = (target: EventTarget, type: string, init: MouseEventInit) =>
  act(() => void target.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })));

function drag(controller: ViewController, from: Element) {
  act(() => controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('plain'))));
  document.elementFromPoint = () => from;
  fire(from, 'pointerdown', { button: 0, buttons: 1, clientX: 10, clientY: 10 });
  fire(document, 'pointermove', { buttons: 1, clientX: 20, clientY: 10 });
  const dragging = controller.root?.hasAttribute('data-quoin-dragging');
  fire(document, 'pointerup', { button: 0, clientX: 20, clientY: 10 });
  return { dragging, selection: controller.editor.state.selection };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('a press inside a block shell', () => {
  it('starts a block selection when it drags across content that is not a control', () => {
    const controller = mount();
    const { dragging, selection } = drag(controller, screen.getByText('inside plain'));
    expect(dragging).toBe(true);
    expect(selection).toEqual({ kind: 'blocks', anchor: 'plain', head: 'plain' });
  });

  it('is left to the element when it lands inside one marked as a native interaction area', () => {
    const controller = mount();
    const { dragging, selection } = drag(controller, screen.getByText('inside native'));
    expect(dragging).toBe(false);
    expect(selection).toEqual(nodeSelection('plain'));
  });
});
