import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in German. */
export const deDiagramLabels: DiagramLabels = {
  diagram: (language) => `${language}-Diagramm`,
  notDrawn: 'Dieses Diagramm konnte nicht gezeichnet werden; sein Quelltext steht darunter.',
};
