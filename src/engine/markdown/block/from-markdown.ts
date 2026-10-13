import { newId } from '../../model/new-id';
import type { QuoinBlock } from '../../model/quoin-block';
import { parseBlocks } from './parse-blocks';
import { treeToBlocks } from './tree-to-blocks';

export type FromMarkdownOptions = { softBreak?: 'newline' | 'space'; newId?: () => string };

export function fromMarkdown(markdown: string, options: FromMarkdownOptions = {}): QuoinBlock[] {
  const { document, refs } = parseBlocks(markdown);
  const drafts = treeToBlocks(document, { softBreak: options.softBreak ?? 'space', refs });
  const makeId = options.newId ?? newId;
  return drafts.map((block) => ({ id: makeId(), ...block }));
}
