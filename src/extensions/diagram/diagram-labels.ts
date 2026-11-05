import { mergeLabels } from '../../i18n/merge-labels';

/** Every string the diagram blocks show or speak. */
export type DiagramLabels = {
  /** Names the block holding a diagram and its source, by the language that draws it. */
  diagram(language: string): string;
  /** What is shown in place of a diagram the host's renderer could not draw. */
  notDrawn: string;
};

export const englishDiagramLabels: DiagramLabels = {
  diagram: (language) => `${language} diagram`,
  notDrawn: 'This diagram could not be drawn; its source is below.',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export const resolveDiagramLabels = (overrides?: Partial<DiagramLabels>): DiagramLabels => mergeLabels(englishDiagramLabels, overrides);
