import type { EngineBlock, EngineDoc } from './types';

export function createDoc(blocks: readonly EngineBlock[]): EngineDoc {
  const index = new Map<string, number>();
  blocks.forEach((block, i) => {
    if (index.has(block.id)) throw new Error(`duplicate block id "${block.id}"`);
    index.set(block.id, i);
  });
  return { blocks, index };
}

export function indexOfBlock(doc: EngineDoc, id: string): number {
  return doc.index.get(id) ?? -1;
}

export function requireBlockIndex(doc: EngineDoc, id: string): number {
  const index = indexOfBlock(doc, id);
  if (index < 0) throw new Error(`no block "${id}"`);
  return index;
}

export function blockById(doc: EngineDoc, id: string): EngineBlock | undefined {
  const index = doc.index.get(id);
  return index === undefined ? undefined : doc.blocks[index];
}

export function updateBlock(doc: EngineDoc, id: string, update: (block: EngineBlock) => EngineBlock): EngineDoc {
  const index = requireBlockIndex(doc, id);
  const next = update(doc.blocks[index]);
  const blocks = doc.blocks.map((block, i) => (i === index ? next : block));
  return next.id === id ? { blocks, index: doc.index } : createDoc(blocks);
}

export function replaceBlocks(
  doc: EngineDoc,
  index: number,
  deleteCount: number,
  inserted: readonly EngineBlock[],
): EngineDoc {
  if (index < 0 || deleteCount < 0 || index + deleteCount > doc.blocks.length) {
    throw new RangeError(`cannot remove ${deleteCount} blocks at ${index} from ${doc.blocks.length}`);
  }
  return createDoc([...doc.blocks.slice(0, index), ...inserted, ...doc.blocks.slice(index + deleteCount)]);
}
