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
export function resolveDiagramLabels(overrides?: Partial<DiagramLabels>): DiagramLabels {
  if (overrides === undefined) return englishDiagramLabels;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishDiagramLabels : { ...englishDiagramLabels, ...Object.fromEntries(given) };
}
