import type { AtomSpec } from './types';

const UNSAFE_LABEL = /[[\]\\\n]/;
const UNSAFE_LATEX = /[$\n]|^\s|\s$|\\$/;

const mention: AtomSpec = {
  type: 'mention',
  toMarkdown({ id, label, kind }) {
    if (!id || label === undefined || UNSAFE_LABEL.test(label)) return null;
    return `[@${label}](mention:${kind ? `${kind}:${id}` : id})`;
  },
  plainText: ({ label }) => `@${label}`,
};

const math: AtomSpec = {
  type: 'math',
  toMarkdown: ({ latex }) => (latex && !UNSAFE_LATEX.test(latex) ? `$${latex}$` : null),
  plainText: ({ latex }) => latex,
};

export const coreAtomSpecs: AtomSpec[] = [mention, math];
