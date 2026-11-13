import type { CalloutTone } from '../../engine/blocks/callout-tones';

/** The names the default renderers give the text of each block and the controls beside it. */
export type RendererLabels = {
  paragraph: string;
  heading: (level: number) => string;
  bulletItem: string;
  numberedItem: (n: number) => string;
  task: string;
  quote: string;
  /** The name of a callout's text, given the name of its tone from `calloutTones`, which it takes as written. */
  callout: (tone: string) => string;
  /** The name of each tone, inside the name of a callout's text. */
  calloutTones: Record<CalloutTone, string>;
  toggle: string;
  /** The name of a closed toggle's chevron, given how many blocks it hides. A chevron hiding none is named by `toggle`. */
  toggleButton: (hidden: number) => string;
};

const TOGGLE = 'Toggle';

export const englishRendererLabels: RendererLabels = {
  paragraph: 'Paragraph',
  heading: (level) => `Heading ${level}`,
  bulletItem: 'Bullet list item',
  numberedItem: (n) => `Numbered list item ${n}`,
  task: 'Task',
  quote: 'Quote',
  callout: (tone) => `Callout, ${tone}`,
  calloutTones: { info: 'info', tip: 'tip', success: 'success', warning: 'warning', danger: 'danger' },
  toggle: TOGGLE,
  toggleButton: (hidden) => (hidden === 0 ? TOGGLE : `${TOGGLE}, ${hidden} ${hidden === 1 ? 'block' : 'blocks'} hidden`),
};

/** The English names with a caller's on top. A key left out or undefined stays English, and so does each tone not named. */
export function rendererLabelsWith(overrides: Partial<RendererLabels> | undefined): RendererLabels {
  if (overrides === undefined) return englishRendererLabels;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  const calloutTones = { ...englishRendererLabels.calloutTones, ...overrides.calloutTones };
  return { ...englishRendererLabels, ...Object.fromEntries(given), calloutTones };
}
