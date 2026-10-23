import type { EngineBlock } from '../model/types';
import { headingLevel as levelOf } from './heading-level';

export const headingId = (blockId: string): string => `h-${blockId}`;

export function headingLevel(block: EngineBlock): number | null {
  if (block.type !== 'MARKDOWN' || block.attrs.kind !== 'heading') return null;
  return levelOf(block.attrs.level);
}

export type Heading = { readonly blockId: string; readonly level: number; readonly text: string };
