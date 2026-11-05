import { mergeLabels } from '../../i18n/merge-labels';

/** Every string the markdown source pane shows or speaks. */
export type SourceLabels = {
  /** The accessible name of the pane. */
  region: string;
};

export const englishSourceLabels: SourceLabels = { region: 'Markdown source' };

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export const resolveSourceLabels = (overrides?: Partial<SourceLabels>): SourceLabels => mergeLabels(englishSourceLabels, overrides);
