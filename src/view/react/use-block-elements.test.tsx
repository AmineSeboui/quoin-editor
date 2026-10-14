import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import type { EngineBlock } from '../../engine';
import type { BlockRenderer } from './block-renderer-types';
import { Editor, md } from './test-harness';
import { useBlockElements } from './use-block-elements';

const block = (id: string): EngineBlock => ({ id, type: 'MARKDOWN', indent: 0, attrs: {}, regions: {} });
const [a, b, c] = ['a', 'b', 'c'].map(block);
const NONE = {};
const propsOf = (element: ReactElement) => element.props as { block: EngineBlock; index: number; renderers: unknown };

describe('useBlockElements', () => {
  it('hands back the same element for a block that did not change', () => {
    const { result, rerender } = renderHook((props) => useBlockElements(props.blocks, NONE), {
      initialProps: { blocks: [a, b, c] },
    });
    const first = result.current;
    const edited = { ...b, attrs: { kind: 'bullet' } };
    rerender({ blocks: [a, edited, c] });
    expect(result.current[0]).toBe(first[0]);
    expect(result.current[1]).not.toBe(first[1]);
    expect(propsOf(result.current[1]).block).toBe(edited);
    expect(result.current[2]).toBe(first[2]);
  });

  it('keys each element by its block id', () => {
    const { result } = renderHook(() => useBlockElements([a, b], NONE));
    expect(result.current.map((element) => element.key)).toEqual(['a', 'b']);
  });

  it('builds new elements for the blocks whose index moved', () => {
    const { result, rerender } = renderHook((props) => useBlockElements(props.blocks, NONE), {
      initialProps: { blocks: [a, c] },
    });
    const first = result.current;
    rerender({ blocks: [a, b, c] });
    expect(result.current[0]).toBe(first[0]);
    expect(result.current[2]).not.toBe(first[1]);
    expect(propsOf(result.current[2]).index).toBe(2);
  });

  it('builds new elements when the renderers change', () => {
    const { result, rerender } = renderHook((props) => useBlockElements([a, b], props.renderers), {
      initialProps: { renderers: NONE },
    });
    const first = result.current;
    const renderers = { MARKDOWN: () => null };
    rerender({ renderers });
    expect(result.current[0]).not.toBe(first[0]);
    expect(propsOf(result.current[0]).renderers).toBe(renderers);
  });

  it('reuses the element of a block that comes back unchanged at the same index', () => {
    const { result, rerender } = renderHook((props) => useBlockElements(props.blocks, NONE), {
      initialProps: { blocks: [a, b] },
    });
    const first = result.current;
    rerender({ blocks: [a] });
    rerender({ blocks: [a, b] });
    expect(result.current[1]).toBe(first[1]);
  });
});

describe('EditorView re-renders', () => {
  it('renders only the block a keystroke changed', () => {
    const rendered: string[] = [];
    const Counting: BlockRenderer = ({ block: current }) => {
      rendered.push(current.id);
      return null;
    };
    let insert!: () => void;
    render(
      <Editor
        options={{ blocks: [md('a', 'one'), md('b', 'two'), md('c', 'three')], onChange: () => {} }}
        view={{ renderers: { MARKDOWN: Counting } }}
        onController={(controller) => {
          insert = () => {
            controller.focus({ block: 'b', region: 'text', offset: 0 });
            controller.edit(() => controller.editor.insertText('x'));
          };
        }}
      />,
    );
    expect(rendered).toEqual(['a', 'b', 'c']);
    rendered.length = 0;
    act(insert);
    expect(rendered).toEqual(['b']);
  });
});
