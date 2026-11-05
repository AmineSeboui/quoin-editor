import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in Spanish. */
export const esDiagramLabels: DiagramLabels = {
  diagram: (language) => `Diagrama ${language}`,
  notDrawn: 'Este diagrama no se ha podido dibujar; su código está debajo.',
};
