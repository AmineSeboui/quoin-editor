import { str } from '../blocks/data-fields';
import { inlineText } from '../model/inline';
import type { EngineBlock, Inline } from '../model/types';
import type { Schema } from '../schema/types';
import { tableCells } from './table-cells';

export function inlinePlainText(inline: Inline, schema: Schema): string {
  return inlineText(inline, (node) => schema.atoms.get(node.type)?.plainText(node.attrs) ?? '');
}

function tablePlainText(block: EngineBlock, schema: Schema): string {
  return tableCells(block)
    .map((row) => row.map((cell) => inlinePlainText(cell, schema)).join('\t'))
    .join('\n');
}

export function blockPlainText(block: EngineBlock, schema: Schema): string {
  const spec = schema.blocks.get(block.type);
  if (spec?.toPlainText) return spec.toPlainText(block);
  const { attrs } = block;
  switch (block.type) {
    case 'CODE':
      return str(attrs.code);
    case 'IMAGE':
      return str(attrs.alt);
    case 'FILE':
      return str(attrs.filename);
    case 'EMBED':
      return str(attrs.url);
    case 'BOOKMARK':
      return str(attrs.title) || str(attrs.url);
    case 'MATH':
      return str(attrs.latex);
    case 'TABLE':
      return tablePlainText(block, schema);
    default:
      return spec?.primaryRegion ? inlinePlainText(block.regions[spec.primaryRegion] ?? [], schema) : '';
  }
}
