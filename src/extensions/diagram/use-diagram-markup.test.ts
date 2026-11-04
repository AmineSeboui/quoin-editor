import { renderHook, waitFor } from '@testing-library/react';
import type { DiagramFeature, RenderDiagram } from './diagram-feature';
import { englishDiagramLabels } from './diagram-labels';
import { useDiagramMarkup } from './use-diagram-markup';

const FIRST = '<svg data-drawn="first"></svg>';
const NEXT = '<svg data-drawn="next"></svg>';

const feature = (render: RenderDiagram | undefined): DiagramFeature => ({
  labels: englishDiagramLabels,
  render,
  languages: ['mermaid'],
});

const draw = (f: DiagramFeature, code: string) =>
  renderHook(({ source }: { source: string }) => useDiagramMarkup(f, source, 'mermaid', true), {
    initialProps: { source: code },
  });

describe('useDiagramMarkup', () => {
  it('gives no markup until the renderer has answered', () => {
    const { result } = draw(feature(async () => FIRST), 'graph');
    expect(result.current).toBeNull();
  });

  it('gives the markup once the renderer answers', async () => {
    const { result } = draw(feature(async () => FIRST), 'graph');
    await waitFor(() => expect(result.current).toBe(FIRST));
  });

  it('keeps the drawing on screen while the next one is being made', async () => {
    let release: ((svg: string) => void) | undefined;
    const render: RenderDiagram = (code) =>
      code === 'graph' ? Promise.resolve(FIRST) : new Promise<string>((resolve) => (release = resolve));

    const { result, rerender } = draw(feature(render), 'graph');
    await waitFor(() => expect(result.current).toBe(FIRST));

    rerender({ source: 'graph TD' });
    await waitFor(() => expect(release).toBeDefined());
    expect(result.current).toBe(FIRST);

    release!(NEXT);
    await waitFor(() => expect(result.current).toBe(NEXT));
  });

  it('ignores an answer for a source that has already been replaced', async () => {
    const pending = new Map<string, (svg: string) => void>();
    const render: RenderDiagram = (code) => new Promise<string>((resolve) => pending.set(code, resolve));

    const { result, rerender } = draw(feature(render), 'one');
    await waitFor(() => expect(pending.has('one')).toBe(true));
    rerender({ source: 'two' });
    await waitFor(() => expect(pending.has('two')).toBe(true));

    pending.get('two')!(NEXT);
    await waitFor(() => expect(result.current).toBe(NEXT));
    pending.get('one')!(FIRST);
    await waitFor(() => expect(result.current).toBe(NEXT));
  });

  it('draws nothing for a language the feature does not draw', () => {
    const { result } = renderHook(() => useDiagramMarkup(feature(() => FIRST), 'x = 1', 'python', false));
    expect(result.current).toBeNull();
  });
});
