import { renderHook, waitFor } from '@testing-library/react';
import { usePrismHighlighter } from './use-prism-highlighter';

const spelled = (lines: ReturnType<NonNullable<ReturnType<typeof usePrismHighlighter>>>) =>
  lines.map((line) => line.map((token) => token.text).join('')).join('\n');

describe('usePrismHighlighter', () => {
  it('gives no highlighter until the grammars have loaded', () => {
    const { result } = renderHook(() => usePrismHighlighter());
    expect(result.current).toBeUndefined();
  });

  it('gives a highlighter once the grammars have loaded', async () => {
    const { result } = renderHook(() => usePrismHighlighter());
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.('const x = 1', 'typescript')[0]).toContainEqual({
      text: 'const',
      className: 'quoin-tok-keyword',
    });
  });

  it('spells the code it is given exactly', async () => {
    const { result } = renderHook(() => usePrismHighlighter());
    await waitFor(() => expect(result.current).toBeDefined());
    const code = 'def f(n):\n\n    return n  # add\n';
    expect(spelled(result.current!(code, 'python'))).toBe(code);
  });

  it('keeps the same highlighter across renders once loaded', async () => {
    const { result, rerender } = renderHook(() => usePrismHighlighter());
    await waitFor(() => expect(result.current).toBeDefined());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('gives the loaded highlighter on the first render of a later canvas', async () => {
    const warm = renderHook(() => usePrismHighlighter());
    await waitFor(() => expect(warm.result.current).toBeDefined());
    const { result } = renderHook(() => usePrismHighlighter());
    expect(result.current).toBeDefined();
  });
});
