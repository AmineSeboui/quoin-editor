let engine: Promise<typeof import('mermaid').default> | null = null;

// Mermaid is far larger than the rest of this site put together, so it is imported only once a page actually draws a
// diagram, and then once for the life of the page.
const load = () =>
  (engine ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
    return mermaid;
  }));

let drawn = 0;

/** A `render` for `diagramExtension`. Mermaid needs an id of its own for each drawing it makes. */
export async function renderDiagram(code: string): Promise<string> {
  const mermaid = await load();
  const { svg } = await mermaid.render(`quoin-diagram-${(drawn += 1)}`, code);
  return svg;
}
