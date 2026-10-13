import type { Inline } from '../model/types';
import type { Heading } from './headings';
import { inlineToHTML } from './inline-to-html';

export type HtmlEnv = {
  readonly resolveAssetUrl: (storageKey: string) => string | null;
  readonly renderMath?: (latex: string, options: { displayMode: boolean }) => string;
  readonly embeds: 'iframe' | 'link';
  readonly headings: readonly Heading[];
};

export type BlockView = {
  readonly excess: number;
  readonly children: string;
};

export const inlineHTML = (inline: Inline | undefined, env: HtmlEnv): string =>
  inlineToHTML(inline ?? [], { renderMath: env.renderMath });
