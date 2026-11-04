'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { diagramExtension, type DiagramOptions } from './extensions/diagram/diagram-extension';
export type { RenderDiagram } from './extensions/diagram/diagram-feature';
export { DEFAULT_DIAGRAM_LANGUAGES } from './extensions/diagram/diagram-languages';
export { englishDiagramLabels, type DiagramLabels } from './extensions/diagram/diagram-labels';
