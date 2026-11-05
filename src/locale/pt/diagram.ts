import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in Portuguese. */
export const ptDiagramLabels: DiagramLabels = {
  diagram: (language) => `Diagrama ${language}`,
  notDrawn: 'Não foi possível desenhar este diagrama; o código dele está abaixo.',
};
