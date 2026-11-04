import { resolveDiagram } from './resolve-diagram';
import type { RenderDiagram } from './diagram-feature';

const svg = '<svg data-drawn="yes"></svg>';

describe('resolveDiagram', () => {
  it('takes markup a renderer gives straight back', async () => {
    await expect(resolveDiagram(() => svg, 'graph TD', 'mermaid')).resolves.toBe(svg);
  });

  it('waits for a renderer that answers with a promise, as the common engines do', async () => {
    const render: RenderDiagram = async () => svg;
    await expect(resolveDiagram(render, 'graph TD', 'mermaid')).resolves.toBe(svg);
  });

  it('hands the source and the language to the renderer', async () => {
    const seen: [string, string][] = [];
    await resolveDiagram((code, language) => (seen.push([code, language]), svg), 'graph TD', 'mermaid');
    expect(seen).toEqual([['graph TD', 'mermaid']]);
  });

  it('draws nothing when there is no renderer', async () => {
    await expect(resolveDiagram(undefined, 'graph TD', 'mermaid')).resolves.toBeNull();
  });

  it('draws nothing when the renderer throws before it returns', async () => {
    const render: RenderDiagram = () => {
      throw new Error('bad diagram');
    };
    await expect(resolveDiagram(render, 'graph TD', 'mermaid')).resolves.toBeNull();
  });

  it('draws nothing when the renderer rejects, which is how an engine reports bad syntax', async () => {
    const render: RenderDiagram = () => Promise.reject(new Error('parse error'));
    await expect(resolveDiagram(render, 'graph TD', 'mermaid')).resolves.toBeNull();
  });

  it.each([
    { answer: '', what: 'nothing at all' },
    { answer: '   ', what: 'only space' },
    { answer: undefined, what: 'no answer' },
    { answer: 42, what: 'something that is not markup' },
  ])('draws nothing when the renderer gives $what', async ({ answer }) => {
    const render = (() => answer) as unknown as RenderDiagram;
    await expect(resolveDiagram(render, 'graph TD', 'mermaid')).resolves.toBeNull();
  });

  it('draws nothing when a promise resolves to something that is not markup', async () => {
    const render = (() => Promise.resolve(7)) as unknown as RenderDiagram;
    await expect(resolveDiagram(render, 'graph TD', 'mermaid')).resolves.toBeNull();
  });
});
