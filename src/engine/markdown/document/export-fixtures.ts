import type { QuoinBlock } from '../../model/quoin-block';
import { fromMarkdown } from '../block/from-markdown';

let counter = 0;

export const md = (markdown: string, indent?: number): QuoinBlock => ({
  id: `m${++counter}`,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent ? { indent } : {}),
});

export const block = (type: string, data: Record<string, unknown>, indent?: number): QuoinBlock => ({
  id: `b${++counter}`,
  type,
  data,
  ...(indent ? { indent } : {}),
});

export const withoutIds = (blocks: readonly { id: string }[]) => blocks.map(({ id: _id, ...rest }) => rest);

export const readBack = (markdown: string) => withoutIds(fromMarkdown(markdown, { softBreak: 'newline' }));
