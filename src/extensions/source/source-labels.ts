/** Every string the markdown source pane shows or speaks. */
export type SourceLabels = {
  /** The accessible name of the pane. */
  region: string;
};

export const englishSourceLabels: SourceLabels = { region: 'Markdown source' };

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveSourceLabels(overrides?: Partial<SourceLabels>): SourceLabels {
  if (overrides === undefined) return englishSourceLabels;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishSourceLabels : { ...englishSourceLabels, ...Object.fromEntries(given) };
}
