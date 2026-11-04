'use client';

import { defineExtension, type Extension } from '../../engine';
import type { ExtensionUI } from '../ui-types';
import { diagramRenderer } from './DiagramBlock';
import type { DiagramFeature, RenderDiagram } from './diagram-feature';
import { resolveDiagramLabels, type DiagramLabels } from './diagram-labels';
import { DEFAULT_DIAGRAM_LANGUAGES } from './diagram-languages';

export type DiagramOptions = {
  /**
   * Draws a diagram from the source of a code block and gives the markup to insert, as Mermaid's `render` does. The
   * markup is inserted as it is, so a host drawing from text it did not write sanitises first. Without one the blocks
   * stay code blocks.
   */
  render?: RenderDiagram;
  /** The code languages drawn as diagrams rather than highlighted. `['mermaid']` by default. */
  languages?: readonly string[];
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<DiagramLabels>;
};

/**
 * Draws a code block whose language names a diagram through the host's renderer, with its source below it. The
 * document is unchanged: a diagram is a fenced code block, and opens as one anywhere else.
 */
export function diagramExtension(options: DiagramOptions = {}): Extension {
  const feature: DiagramFeature = {
    labels: resolveDiagramLabels(options.labels),
    render: options.render,
    languages: options.languages ?? DEFAULT_DIAGRAM_LANGUAGES,
  };
  const ui: ExtensionUI = { renderers: { CODE: diagramRenderer(feature) } };
  return defineExtension({ name: 'diagram', ui });
}
