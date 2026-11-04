import type { DiagramLabels } from './diagram-labels';

/**
 * Draws a diagram from the source of a code block and gives the markup to insert, at once or through a promise, as
 * Mermaid's `render` does, which parses and lays out asynchronously. The
 * markup is trusted: the canvas inserts it as it is, so a host that draws from text it did not write sanitises first.
 */
export type RenderDiagram = (code: string, language: string) => string | Promise<string>;

/** The options of one diagram extension, resolved once, shared by every block it draws. */
export type DiagramFeature = {
  readonly labels: DiagramLabels;
  readonly render: RenderDiagram | undefined;
  readonly languages: readonly string[];
};
