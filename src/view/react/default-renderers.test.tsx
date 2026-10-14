import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { textSelection } from '../../engine';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import type { ViewController } from '../controller/view-controller';
import { defaultRenderers, type BlockRenderProps } from './default-renderers';
import { Editor, hostOf, md } from './test-harness';

function mount(blocks: QuoinBlock[], extra: Partial<Parameters<typeof Editor>[0]['options']> = {}) {
  let controller!: ViewController;
  const view = render(
    <Editor options={{ blocks, onChange: () => {}, ...extra }} onController={(c) => (controller = c)} />,
  );
  return { ...view, controller };
}

const caretIn = (block: string, offset: number) => textSelection({ block, region: 'text', offset });

describe('default renderers', () => {
  it('covers the block types the engine renders as text', () => {
    expect(Object.keys(defaultRenderers).sort()).toEqual(['CALLOUT', 'MARKDOWN', 'TOGGLE']);
  });

  it('labels each text kind for assistive technology', () => {
    mount([md('p', 'plain'), md('h', '### three'), md('b', '- bullet'), md('t', '- [ ] task'), md('q', '> quote')]);
    for (const name of ['Paragraph', 'Heading 3', 'Bullet list item', 'Task', 'Quote']) {
      expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
    }
  });

  it('exposes a heading with its level around the text host', () => {
    mount([md('h', '## Two')]);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(within(heading).getByRole('textbox', { name: 'Heading 2' })).toHaveTextContent('Two');
  });

  it('shows an empty heading its own name as a placeholder', () => {
    mount([md('h', '## ')]);
    expect(screen.getByRole('textbox', { name: 'Heading 2' })).toHaveAttribute('data-placeholder', 'Heading 2');
  });

  it('draws a hidden marker beside list items', () => {
    const { container } = mount([md('b', '- bullet')]);
    const marker = container.querySelector('.quoin-marker');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
    expect(marker).toHaveTextContent('\u2022');
  });

  it('numbers ordered items from the first one and renumbers when the list changes', () => {
    const { container, controller } = mount([md('a', '3. a'), md('b', '1. b'), md('c', 'break'), md('d', '1. d')]);
    const markers = () => Array.from(container.querySelectorAll('.quoin-marker'), (m) => m.textContent);
    expect(markers()).toEqual(['3.', '4.', '1.']);
    expect(screen.getByRole('textbox', { name: 'Numbered list item 4' })).toHaveTextContent('b');
    act(() => void controller.editor.setBlocks([md('a', '3. a'), md('n', '1. new'), md('b', '1. b'), md('c', 'break'), md('d', '1. d')]));
    expect(markers()).toEqual(['3.', '4.', '5.', '1.']);
    expect(screen.getByRole('textbox', { name: 'Numbered list item 5' })).toHaveTextContent('b');
  });

  it('keeps every host of a long numbered list in step when the first item changes', () => {
    const items = Array.from({ length: 30 }, (_, i) => md(`i${i}`, `1. item ${i}`));
    const { controller } = mount(items);
    expect(screen.getByRole('textbox', { name: 'Numbered list item 30' })).toBeInTheDocument();
    act(() => void controller.editor.setBlocks([md('i0', '10. item 0'), ...items.slice(1)]));
    expect(screen.getByRole('textbox', { name: 'Numbered list item 39' })).toBeInTheDocument();
  });

  it('shows a task checkbox that reflects the block and strikes a done task', () => {
    const { container } = mount([md('a', '- [ ] open'), md('b', '- [x] done')]);
    const [open, done] = screen.getAllByRole('checkbox', { name: 'Task' });
    expect(open).toHaveAttribute('aria-checked', 'false');
    expect(done).toHaveAttribute('aria-checked', 'true');
    expect(done).toHaveAttribute('contenteditable', 'false');
    expect(container.querySelector('[data-block-id="b"] .quoin-task')).toHaveAttribute('data-checked', 'true');
  });

  it('toggles a task without moving the caret', () => {
    const { controller } = mount([md('a', 'text'), md('b', '- [ ] job')]);
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('a', 2))));
    act(() => screen.getByRole('checkbox', { name: 'Task' }).click());
    expect(controller.editor.getBlocks()[1].data.markdown).toBe('- [x] job');
    expect(controller.editor.state.selection).toEqual(caretIn('a', 2));
    act(() => screen.getByRole('checkbox', { name: 'Task' }).click());
    expect(controller.editor.getBlocks()[1].data.markdown).toBe('- [ ] job');
  });

  it('does not toggle a task while read-only', () => {
    const { controller } = mount([md('b', '- [ ] job')], { readOnly: true });
    act(() => screen.getByRole('checkbox', { name: 'Task' }).click());
    expect(controller.editor.getBlocks()[0].data.markdown).toBe('- [ ] job');
  });

  it('keeps focus where it is when a control inside a block is pressed', () => {
    mount([md('b', '- [ ] job'), { id: 't', type: 'TOGGLE', data: { markdown: 'sum', open: true } }]);
    expect(fireEvent.mouseDown(screen.getByRole('checkbox', { name: 'Task' }))).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: 'Toggle' }))).toBe(false);
  });

  it('labels a callout with its tone and defaults the tone to info', () => {
    const { container } = mount([
      { id: 'c', type: 'CALLOUT', data: { tone: 'warning', body: 'careful' } },
      { id: 'd', type: 'CALLOUT', data: { body: 'plain' } },
    ]);
    expect(screen.getByRole('textbox', { name: 'Callout, warning' })).toHaveTextContent('careful');
    expect(screen.getByRole('textbox', { name: 'Callout, info' })).toHaveTextContent('plain');
    expect(container.querySelector('[data-block-id="c"] .quoin-callout')).toHaveAttribute('data-tone', 'warning');
  });
});

describe('toggle blocks', () => {
  const toggle = (open: boolean): QuoinBlock[] => [
    { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open } },
    md('c', 'child', 1),
    md('g', 'grandchild', 2),
    md('s', 'sibling'),
  ];

  it('shows a closed toggle without the blocks nested under it', () => {
    const { container } = mount(toggle(false));
    const chevron = screen.getByRole('button', { name: 'Toggle' });
    expect(chevron).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('textbox', { name: 'Toggle' })).toHaveTextContent('Summary');
    expect(Array.from(container.querySelectorAll('[data-quoin-block]'), (s) => (s as HTMLElement).dataset.blockId)).toEqual(['t', 's']);
  });

  it('opens and closes through the chevron, bringing the nested blocks back and taking them away', () => {
    const { container, controller } = mount(toggle(false));
    const ids = () => Array.from(container.querySelectorAll('[data-quoin-block]'), (s) => (s as HTMLElement).dataset.blockId);
    act(() => screen.getByRole('button', { name: 'Toggle' }).click());
    expect(controller.editor.state.doc.blocks[0].attrs.open).toBe(true);
    expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-expanded', 'true');
    expect(ids()).toEqual(['t', 'c', 'g', 's']);
    expect(hostOf(container, 'g')).toHaveTextContent('grandchild');
    act(() => screen.getByRole('button', { name: 'Toggle' }).click());
    expect(ids()).toEqual(['t', 's']);
    expect(controller.registry.get('g', 'text')).toBeUndefined();
  });

  it('leaves the caret alone when the chevron is pressed', () => {
    const { controller } = mount(toggle(true));
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(caretIn('s', 1))));
    act(() => screen.getByRole('button', { name: 'Toggle' }).click());
    expect(controller.editor.state.selection).toEqual(caretIn('s', 1));
  });
});

describe('block renderer lookup', () => {
  it('falls back to a plain box naming the type for a type nothing renders', () => {
    const { container } = mount([{ id: 'd', type: 'DIVIDER', data: {} }]);
    const box = container.querySelector('[data-type="DIVIDER"] .quoin-void');
    expect(box).toHaveTextContent('DIVIDER');
    expect(box).toHaveAttribute('contenteditable', 'false');
  });

  it('does not mistake a type named like an Object property for a renderer', () => {
    const { container } = mount([{ id: 'x', type: 'constructor', data: {} }, { id: 'y', type: '__proto__', data: {} }]);
    expect(container.querySelectorAll('.quoin-void')).toHaveLength(2);
  });

  it('prefers the caller\'s renderer and hands it the block, the controller and the index', () => {
    const seen: BlockRenderProps[] = [];
    const Custom = (props: BlockRenderProps) => {
      seen.push(props);
      return <p>custom {props.block.id}</p>;
    };
    let controller!: ViewController;
    render(
      <Editor
        options={{ blocks: [md('a', 'one'), md('b', 'two')], onChange: () => {} }}
        view={{ renderers: { MARKDOWN: Custom } }}
        onController={(c) => (controller = c)}
      />,
    );
    expect(screen.getByText('custom a')).toBeInTheDocument();
    expect(seen.map((props) => props.block.id)).toEqual(['a', 'b']);
    expect(seen[0].controller).toBe(controller);
    expect(seen[0].block.id).toBe('a');
  });
});
