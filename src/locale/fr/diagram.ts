import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in French. */
export const frDiagramLabels: DiagramLabels = {
  diagram: (language) => `Diagramme ${language}`,
  notDrawn: 'Ce diagramme n’a pas pu être dessiné ; sa source est ci-dessous.',
};
