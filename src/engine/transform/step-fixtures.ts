import { text } from '../model/inline';
import type { EngineBlock, EngineDoc, Pos } from '../model/types';
import type { CreatedBlock } from './step';

export const para = (id: string, value: string, extra: Partial<EngineBlock> = {}): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: value ? [text(value)] : [] },
  ...extra,
});

export const divider = (id: string): EngineBlock => ({ id, type: 'DIVIDER', indent: 0, attrs: {}, regions: {} });

export const pos = (block: string, offset: number, region = 'text'): Pos => ({ block, region, offset });

export const created = (id: string, extra: Partial<CreatedBlock> = {}): CreatedBlock => ({
  id,
  type: 'MARKDOWN',
  attrs: { kind: 'paragraph' },
  indent: 0,
  region: 'text',
  ...extra,
});

export const idsOf = (doc: EngineDoc): string[] => doc.blocks.map((block) => block.id);
