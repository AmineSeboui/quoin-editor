import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in Simplified Chinese. */
export const zhDiagramLabels: DiagramLabels = {
  diagram: (language) => `${language} 图表`,
  notDrawn: '无法绘制该图表，源代码在下方。',
};
