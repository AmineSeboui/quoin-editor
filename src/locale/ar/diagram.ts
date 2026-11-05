import type { DiagramLabels } from '../../extensions/diagram/diagram-labels';

/** Every string the diagram feature shows or speaks, in Arabic. */
export const arDiagramLabels: DiagramLabels = {
  diagram: (language) => `مخطط ${language}`,
  notDrawn: 'تعذّر رسم هذا المخطط، ومصدره بالأسفل.',
};
