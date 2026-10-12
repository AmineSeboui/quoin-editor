import { inlineCodec } from '../markdown/inline/serialize-inline';
import { createDoc } from '../model/doc';
import { newId } from '../model/new-id';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock, EngineDoc } from '../model/types';
import type { CodecContext, Schema } from '../schema/types';
import { specFor } from './unknown-spec';

export type BlockCodec = {
  toEngineBlocks(block: QuoinBlock): EngineBlock[];
  toQuoin(block: EngineBlock): QuoinBlock;
  docFromBlocks(blocks: readonly QuoinBlock[]): EngineDoc;
  blocksFromDoc(doc: EngineDoc): QuoinBlock[];
  context: CodecContext;
};

const indentOf = (indent: unknown) => (typeof indent === 'number' && Number.isInteger(indent) && indent > 0 ? indent : 0);

export function createBlockCodec(schema: Schema, options: { newId?: () => string } = {}): BlockCodec {
  const context: CodecContext = { inline: inlineCodec, newId: options.newId ?? newId };
  const engineBlocks = new WeakMap<QuoinBlock, EngineBlock[]>();
  const quoinBlocks = new WeakMap<EngineBlock, QuoinBlock>();

  function toEngineBlocks(block: QuoinBlock): EngineBlock[] {
    const cached = engineBlocks.get(block);
    if (cached) return [...cached];
    const { attrs, regions } = specFor(schema, block.type).fromData(block.data, context);
    const engine: EngineBlock = { id: block.id, type: block.type, indent: indentOf(block.indent), attrs, regions };
    engineBlocks.set(block, [engine]);
    quoinBlocks.set(engine, block);
    return [engine];
  }

  function toQuoin(block: EngineBlock): QuoinBlock {
    const cached = quoinBlocks.get(block);
    if (cached) return cached;
    const data = specFor(schema, block.type).toData(block, context);
    const quoin: QuoinBlock = { id: block.id, type: block.type, data };
    if (block.indent > 0) quoin.indent = block.indent;
    quoinBlocks.set(block, quoin);
    return quoin;
  }

  function docFromBlocks(blocks: readonly QuoinBlock[]): EngineDoc {
    const used = new Set<string>();
    const converted = blocks.flatMap(toEngineBlocks).map((block) => {
      const unique = used.has(block.id) ? { ...block, id: context.newId() } : block;
      used.add(unique.id);
      return unique;
    });
    return createDoc(converted);
  }

  return {
    toEngineBlocks,
    toQuoin,
    docFromBlocks,
    blocksFromDoc: (doc) => doc.blocks.map((block) => toQuoin(block)),
    context,
  };
}
