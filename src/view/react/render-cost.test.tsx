import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import type { KeyLike } from '../../engine/extension/keymap';
import { moveBlocksDown, moveBlocksUp } from '../../engine/commands/block-structure';
import type { ViewController } from '../controller/view-controller';
import type { BlockPlaceholder } from './block-placeholder';
import type { BlockRenderer } from './block-renderer-types';
import { MarkdownBlock } from './markdown-block';
import { Editor, md } from './test-harness';

const key = (name: string): KeyLike => ({ key: name, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false });

function mount(blocks: ReturnType<typeof md>[], blockPlaceholder?: BlockPlaceholder) {
  const rendered: string[] = [];
  const Counting: BlockRenderer = (props) => {
    rendered.push(props.block.id);
    return <MarkdownBlock {...props} />;
  };
  let controller!: ViewController;
  const result = render(
    <Editor
      options={{ blocks, onChange: () => {} }}
      view={{ renderers: { MARKDOWN: Counting }, blockPlaceholder }}
      onController={(c) => (controller = c)}
    />,
  );
  const press = (name: string) => act(() => void controller.edit(() => controller.editor.handleKey(key(name))));
  const caret = (block: string, offset: number) =>
    act(() => controller.focus({ block, region: 'text', offset }));
  const markers = () => Array.from(result.container.querySelectorAll('.quoin-marker'), (marker) => marker.textContent);
  return { controller, rendered, press, caret, markers };
}

const paragraphs = (count: number) => Array.from({ length: count }, (_, i) => md(`p${i}`, `Paragraph ${i}`));

describe('a structural edit near the top of a 1,000 block document', () => {
  const original = new Set(paragraphs(1000).map((block) => block.id));
  const changed = (rendered: string[]) => rendered.filter((id) => !original.has(id) || id === 'p0' || id === 'p1');

  it('renders the block it split and the new one, not the 998 after them', () => {
    const { rendered, press, caret } = mount(paragraphs(1000));
    caret('p0', 4);
    rendered.length = 0;
    press('Enter');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThanOrEqual(2);
    expect(rendered).toEqual(changed(rendered));
  });

  it('renders only the block a Backspace merge grew', () => {
    const { rendered, press, caret } = mount(paragraphs(1000));
    caret('p1', 0);
    rendered.length = 0;
    press('Backspace');
    expect(rendered).toEqual(['p0']);
  });

  it('renders only the new blocks and the one a multi-line paste landed in', () => {
    const { controller, rendered, caret } = mount(paragraphs(1000));
    caret('p0', 0);
    rendered.length = 0;
    act(() => void controller.edit(() => controller.editor.paste({ text: 'one\n\ntwo\n\nthree' })));
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThanOrEqual(4);
    expect(rendered).toEqual(changed(rendered));
  });

  it('renders nothing when the block at the top is deleted', () => {
    const { rendered, press, caret } = mount(paragraphs(1000));
    caret('p0', 0);
    press('Escape');
    rendered.length = 0;
    press('Backspace');
    expect(rendered).toEqual([]);
  });
});

describe('a placeholder that follows the caret', () => {
  it('moves from one empty paragraph to another without rendering any block again', () => {
    const empty = Array.from({ length: 200 }, (_, i) => md(`p${i}`, ''));
    const { controller, rendered, caret } = mount(empty, (state, block) =>
      state.selection?.kind === 'text' && state.selection.head.block === block.id ? 'Type here' : undefined,
    );
    caret('p0', 0);
    rendered.length = 0;
    caret('p150', 0);
    expect(rendered).toEqual([]);
    const placed = controller.root!.querySelectorAll('[data-placeholder]');
    expect(Array.from(placed, (host) => host.closest('[data-block-id]')!.getAttribute('data-block-id'))).toEqual(['p150']);
  });
});

const numbered = [md('a', '1. a'), md('b', '1. b'), md('c', '1. c'), md('d', 'plain'), md('e', '1. e')];

describe('ordered list numbers after a structural edit', () => {
  it('renumber after an insert, without rendering the items whose number stayed', () => {
    const { rendered, press, caret, markers } = mount(numbered);
    expect(markers()).toEqual(['1.', '2.', '3.', '1.']);
    caret('b', 3);
    rendered.length = 0;
    press('Enter');
    expect(markers()).toEqual(['1.', '2.', '3.', '4.', '1.']);
    expect(rendered.filter((id) => id === 'a' || id === 'c' || id === 'e')).toEqual([]);
  });

  it('renumber after a delete', () => {
    const { controller, markers } = mount(numbered);
    act(() => void controller.editor.setBlocks(numbered.filter((block) => block.id !== 'a')));
    expect(markers()).toEqual(['1.', '2.', '1.']);
  });

  it('renumber after a move', () => {
    const { controller, markers, caret } = mount([md('a', '1. a'), md('b', '1. b'), md('p', 'plain'), md('c', '1. c')]);
    expect(markers()).toEqual(['1.', '2.', '1.']);
    caret('p', 0);
    act(() => void controller.run(moveBlocksUp));
    expect(markers()).toEqual(['1.', '1.', '2.']);
    act(() => void controller.run(moveBlocksDown));
    expect(markers()).toEqual(['1.', '2.', '1.']);
  });
});
