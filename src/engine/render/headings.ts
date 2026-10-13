import type { EngineBlock } from '../model/types';

export const headingId = (blockId: string): string => `h-${blockId}`;

export function headingLevel(block: EngineBlock): number | null {
  if (block.type !== 'MARKDOWN' || block.attrs.kind !== 'heading') return null;
  const { level } = block.attrs;
  return typeof level === 'number' && Number.isInteger(level) ? Math.min(6, Math.max(1, level)) : 1;
}

export type Heading = { readonly id: string; readonly level: number; readonly text: string };
