import type { EngineDoc } from '../model/types';

export const orphans = (doc: EngineDoc) =>
  doc.blocks.flatMap((block, i) => (block.indent > (i === 0 ? 0 : doc.blocks[i - 1].indent + 1) ? [block.id] : []));
