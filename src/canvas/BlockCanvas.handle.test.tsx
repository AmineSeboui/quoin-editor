import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { textSelection } from '../engine';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const at = (block: string, offset: number) => textSelection({ block, region: 'text', offset });

function mount(blocks: QuoinBlock[], props: { autoFocus?: boolean; resolveAssetUrl?: (key: string) => string } = {}) {
  const ref = createRef<QuoinEditorHandle>();
  render(<BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} {...props} />);
  return () => ref.current!;
}

describe('the BlockCanvas handle', () => {
  it('exposes the editor and the controller that drives it', () => {
    const handle = mount([md('a', 'one')]);
    expect(handle().controller.editor).toBe(handle().editor);
    expect(handle().editor.getBlocks()).toEqual([md('a', 'one')]);
  });

  it('focuses the document at the start, the end or a position', () => {
    const handle = mount([md('a', 'one'), md('b', 'two')]);
    const [first, second] = screen.getAllByRole('textbox', { name: 'Paragraph' });
    act(() => handle().focus('end'));
    expect(document.activeElement).toBe(second);
    expect(handle().editor.state.selection).toEqual(at('b', 3));
    act(() => handle().focus({ block: 'a', region: 'text', offset: 1 }));
    expect(document.activeElement).toBe(first);
    expect(handle().editor.state.selection).toEqual(at('a', 1));
  });

  it('exports the document as markdown, with asset urls from the canvas resolver', () => {
    const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: 'A cat' } };
    const handle = mount([md('a', 'one **two**'), image], { resolveAssetUrl: (key) => `/files/${key}` });
    const markdown = handle().toMarkdown();
    expect(markdown).toContain('one **two**');
    expect(markdown).toContain('![A cat](/files/cat.png)');
  });
});

describe('BlockCanvas autoFocus', () => {
  it('leaves focus where it was by default', () => {
    mount([md('a', 'one')]);
    expect(document.activeElement).toBe(document.body);
  });

  it('focuses the start of the document on mount', () => {
    const handle = mount([md('a', 'one'), md('b', 'two')], { autoFocus: true });
    expect(document.activeElement).toBe(screen.getAllByRole('textbox', { name: 'Paragraph' })[0]);
    expect(handle().editor.state.selection).toEqual(at('a', 0));
  });

  it('focuses the host of an empty document on mount', () => {
    mount([], { autoFocus: true });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Paragraph' }));
  });
});
