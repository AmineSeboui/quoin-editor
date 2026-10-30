import { inlineCodec } from '../markdown/inline/serialize-inline';
import { countOf } from '../model/count';
import { createDoc } from '../model/doc';
import { newId } from '../model/new-id';
import type { QuoinBlock } from '../model/quoin-block';
import { sameEngineBlock } from '../model/same-engine-block';
import type { EngineBlock, EngineDoc } from '../model/types';
import type { CodecContext, Schema } from '../schema/types';
import { splitLegacyBlock } from './legacy-split';
import { withUniqueIds } from './unique-ids';
import { specFor } from './unknown-spec';

export type BlockCodec = {
  toEngineBlocks(block: QuoinBlock): EngineBlock[];
  toQuoin(block: EngineBlock): QuoinBlock;
  docFromBlocks(blocks: readonly QuoinBlock[]): EngineDoc;
  blocksFromDoc(doc: EngineDoc): QuoinBlock[];
  context: CodecContext;
};

type SplitGroup = { readonly original: QuoinBlock; readonly blocks: readonly EngineBlock[] };

const NO_IDS: ReadonlySet<string> = new Set();

export function createBlockCodec(schema: Schema, options: { newId?: () => string } = {}): BlockCodec {
  const context: CodecContext = { inline: inlineCodec, newId: options.newId ?? newId };
  const engineBlocks = new WeakMap<QuoinBlock, EngineBlock[]>();
  const quoinBlocks = new WeakMap<EngineBlock, QuoinBlock>();
  const splitGroups = new WeakMap<EngineBlock, SplitGroup>();
  const remembered = new Map<string, EngineBlock[]>();
  const groupsById = new Map<string, SplitGroup>();

  function convert(block: QuoinBlock): EngineBlock {
    const { attrs, regions } = specFor(schema, block.type).fromData(block.data, context);
    return { id: block.id, type: block.type, indent: countOf(block.indent), attrs, regions };
  }

  // Pieces cached for an earlier document are read again when a real block of this one has taken a derived id.
  function engineBlocksAmong(block: QuoinBlock, taken: ReadonlySet<string>): EngineBlock[] {
    const cached = engineBlocks.get(block);
    if (cached?.every((piece, index) => index === 0 || !taken.has(piece.id))) return [...cached];
    const pieces = splitLegacyBlock(block, countOf(block.indent), taken);
    if (pieces) {
      const blocks = pieces.map(convert);
      engineBlocks.set(block, blocks);
      const group = { original: block, blocks };
      for (const piece of blocks) {
        splitGroups.set(piece, group);
        remembered.set(piece.id, [piece]);
      }
      groupsById.set(blocks[0].id, group);
      return [...blocks];
    }
    const engine = convert(block);
    engineBlocks.set(block, [engine]);
    quoinBlocks.set(engine, block);
    remembered.set(engine.id, [engine]);
    return [engine];
  }

  function toQuoin(block: EngineBlock): QuoinBlock {
    const cached = quoinBlocks.get(block);
    if (cached) return cached;
    const earlier = remembered.get(block.id) ?? [];
    const match = [...earlier].reverse().find((piece) => quoinBlocks.has(piece) && sameEngineBlock(piece, block));
    const earlierQuoin = match && quoinBlocks.get(match);
    if (earlierQuoin) {
      quoinBlocks.set(block, earlierQuoin);
      return earlierQuoin;
    }
    const data = specFor(schema, block.type).toData(block, context);
    const quoin: QuoinBlock = { id: block.id, type: block.type, data };
    if (block.indent > 0) quoin.indent = block.indent;
    quoinBlocks.set(block, quoin);
    engineBlocks.set(quoin, [block]);
    remembered.set(block.id, [...earlier.slice(0, 1), ...earlier.slice(1).slice(-1), block]);
    return quoin;
  }

  const toEngineBlocks = (block: QuoinBlock) => engineBlocksAmong(block, NO_IDS);

  function docFromBlocks(blocks: readonly QuoinBlock[]): EngineDoc {
    const taken = new Set(blocks.map((block) => block.id));
    return createDoc(withUniqueIds(blocks.flatMap((block) => engineBlocksAmong(block, taken)), context.newId));
  }

  function blocksFromDoc(doc: EngineDoc): QuoinBlock[] {
    const result: QuoinBlock[] = [];
    for (let at = 0; at < doc.blocks.length; ) {
      const group = splitGroups.get(doc.blocks[at]) ?? groupsById.get(doc.blocks[at].id);
      const intact = group?.blocks.every((piece, offset) => {
        const block = doc.blocks[at + offset];
        return block !== undefined && (block === piece || sameEngineBlock(block, piece));
      });
      if (group && intact) {
        result.push(group.original);
        at += group.blocks.length;
      } else {
        result.push(toQuoin(doc.blocks[at]));
        at++;
      }
    }
    return result;
  }

  return { toEngineBlocks, toQuoin, docFromBlocks, blocksFromDoc, context };
}
