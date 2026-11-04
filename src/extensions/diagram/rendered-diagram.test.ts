import { renderedDiagram } from './rendered-diagram';
import type { RenderDiagram } from './diagram-feature';

const svg = '<svg role="img"><rect /></svg>';

describe('renderedDiagram', () => {
  it('gives the markup the host drew', () => {
    const render: RenderDiagram = () => svg;
    expect(renderedDiagram(render, 'graph TD; a-->b', 'mermaid')).toBe(svg);
  });

  it('hands the source and the language to the host', () => {
    const seen: [string, string][] = [];
    const render: RenderDiagram = (code, language) => (seen.push([code, language]), svg);
    renderedDiagram(render, 'graph TD', 'mermaid');
    expect(seen).toEqual([['graph TD', 'mermaid']]);
  });

  it('draws nothing when there is no renderer, so the source stands alone', () => {
    expect(renderedDiagram(undefined, 'graph TD', 'mermaid')).toBeNull();
  });

  it('draws nothing when the renderer throws, rather than losing the block', () => {
    const render: RenderDiagram = () => {
      throw new Error('bad diagram');
    };
    expect(renderedDiagram(render, 'graph TD', 'mermaid')).toBeNull();
  });

  it.each([
    { answer: '', what: 'nothing at all' },
    { answer: '   ', what: 'only space' },
    { answer: undefined, what: 'no answer' },
    { answer: 42, what: 'something that is not markup' },
  ])('draws nothing when the renderer gives $what', ({ answer }) => {
    const render = (() => answer) as unknown as RenderDiagram;
    expect(renderedDiagram(render, 'graph TD', 'mermaid')).toBeNull();
  });
});
