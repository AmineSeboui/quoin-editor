import type { DiagramLabels } from './diagram-labels';

/**
 * Draws a diagram from the source of a code block, as Mermaid's `render` does, and gives the markup to insert. The
 * markup is trusted: the canvas inserts it as it is, so a host that draws from text it did not write sanitises first.
 */
export type RenderDiagram = (code: string, language: string) => string;

/** The options of one diagram extension, resolved once, shared by every block it draws. */
export type DiagramFeature = {
  readonly labels: DiagramLabels;
  readonly render: RenderDiagram | undefined;
  readonly languages: readonly string[];
};
