import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in Japanese. */
export const jaDiagramLabels: DiagramLabels = {
  diagram: (language) => `${language} の図`,
  notDrawn: 'この図は描けませんでした。元のコードは下にあります。',
};
