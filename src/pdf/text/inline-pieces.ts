import type { Inline, InlineNode } from '../../engine/model/types';
import type { Schema } from '../../engine/schema/types';
import { linkTarget } from '../../export/link-target';
import type { Piece } from './glyph-items';
import { markedStyle } from './mark-style';
import { LINK, type TextStyle } from './text-style';

export type InlineReading = { readonly schema: Schema; readonly baseUrl?: string };

/** The style of a link to `uri`: the link colour, underlined, over whatever its marks set. */
export const linkedStyle = (style: TextStyle, uri: string): TextStyle => ({ ...style, color: LINK, underline: true, link: { uri } });

function nodePiece(node: InlineNode, reading: InlineReading, base: TextStyle): Piece {
  const style = markedStyle(node.marks, base);
  const link = node.marks.find((mark) => mark.type === 'link');
  const uri = link ? linkTarget(link.attrs?.href ?? '', reading.baseUrl) : null;
  const linked = uri === null ? style : linkedStyle(style, uri);
  if (node.kind === 'text') return { text: node.text, style: linked };
  const text = reading.schema.atoms.get(node.type)?.plainText(node.attrs) ?? '';
  return { text, style: node.type === 'math' ? { ...linked, mono: true } : linked };
}

/** The text of an inline region in styled pieces; a link becomes one only where an exported file can open it. */
export const inlinePieces = (inline: Inline | undefined, reading: InlineReading, base: TextStyle): Piece[] =>
  (inline ?? []).map((node) => nodePiece(node, reading, base));
