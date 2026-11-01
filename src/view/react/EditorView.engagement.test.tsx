import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { nodeSelection, type QuoinBlock } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import type { BlockRenderer } from './block-renderer-types';
import { Editor, hostOf, md } from './test-harness';

const divider = (id: string): QuoinBlock => ({ id, type: 'DIVIDER', data: {} });

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function mount(children?: ReactNode, renderers?: Readonly<Record<string, BlockRenderer>>) {
  let controller!: ViewController;
  const { container } = render(
    <>
      <Editor
        options={{ blocks: [divider('d'), md('a', 'hello'), divider('e')], onChange: () => {} }}
        view={{ children, renderers }}
        onController={(c) => (controller = c)}
      />
      <button type="button">Outside</button>
    </>,
  );
  const root = container.querySelector<HTMLElement>('[aria-label="Doc"]')!;
  const selected = () =>
    Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-quoin-block][data-selected="true"]'), (shell) => shell.dataset.blockId);
  const status = root.querySelector(':scope > [role="status"]')!;
  return { controller, container, selected, status };
}

describe('EditorView before anyone engages it', () => {
  it('draws no block as selected and announces none while the editor only starts on a block without text', () => {
    const { controller, selected, status } = mount();
    expect(controller.editor.state.selection).toEqual(nodeSelection('d'));
    expect(selected()).toEqual([]);
    expect(status).toBeEmptyDOMElement();
  });

  it('draws that block as selected once focus enters the editor, and keeps it when focus leaves', () => {
    const { controller, selected, status } = mount();
    act(() => controller.focus());
    expect(selected()).toEqual(['d']);
    expect(status).toHaveTextContent('1 block selected');
    act(() => screen.getByRole('button', { name: 'Outside' }).focus());
    expect(selected()).toEqual(['d']);
  });

  it('draws it once focus reaches a menu the editor portals out of its tree', () => {
    const menu = createPortal(<button type="button">Block menu item</button>, document.body);
    const { selected } = mount(menu);
    act(() => screen.getByRole('button', { name: 'Block menu item' }).focus());
    expect(selected()).toEqual(['d']);
  });

  it('redraws only the selected block when the editor is first engaged', () => {
    const rendered: string[] = [];
    const Counting: BlockRenderer = ({ block }) => {
      rendered.push(block.id);
      return null;
    };
    const { controller, selected } = mount(undefined, { MARKDOWN: Counting, DIVIDER: Counting });
    rendered.length = 0;
    act(() => controller.engagement.engage());
    expect(selected()).toEqual(['d']);
    expect(rendered).toEqual(['d']);
  });

  it('draws a block the host selects without focus', () => {
    const { controller, selected } = mount();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection('e'))));
    expect(selected()).toEqual(['e']);
  });

  it('draws no block a document the host loads starts on', () => {
    const { controller, selected } = mount();
    act(() => void controller.editor.setBlocks([divider('x'), md('y', 'loaded')]));
    expect(controller.editor.state.selection).toEqual(nodeSelection('x'));
    expect(selected()).toEqual([]);
  });

  it('stays unengaged when focus enters another editor drawn inside it', () => {
    const inner = <Editor options={{ blocks: [md('n', 'nested')], onChange: () => {} }} view={{ 'aria-label': 'Inner' }} />;
    const { container, selected } = mount(inner);
    const innerRoot = container.querySelector<HTMLElement>('[aria-label="Inner"]')!;
    act(() => hostOf(innerRoot, 'n').focus());
    expect(selected()).toEqual([]);
  });
});
