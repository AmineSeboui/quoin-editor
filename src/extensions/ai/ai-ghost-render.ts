import { createBlockCodec, createSchema, fromMarkdown, toPlainText, type Schema } from '../../engine';
import type { BlockCodec } from '../../engine/blocks/codec';
import { primaryRegion } from '../../engine/state/selection';
import { renderInline } from '../../view';

let reader: { schema: Schema; codec: BlockCodec } | null = null;

function readerOf(): { schema: Schema; codec: BlockCodec } {
  if (reader === null) {
    const schema = createSchema();
    reader = { schema, codec: createBlockCodec(schema) };
  }
  return reader;
}

/**
 * Draws the answer as it streams into `ghost`, from the engine's own reading of its markdown, inline content by the
 * view's own renderer, so nothing the host wrote is ever parsed as HTML.
 */
export function fillGhost(ghost: HTMLElement, markdown: string): void {
  const doc = ghost.ownerDocument;
  const { schema, codec } = readerOf();
  const drawn: HTMLElement[] = [];
  for (const block of fromMarkdown(markdown)) {
    for (const piece of codec.toEngineBlocks(block)) {
      const element = doc.createElement('div');
      element.className = 'quoin-ai-ghost-block';
      element.dataset.kind = String(piece.attrs.kind ?? piece.type.toLowerCase());
      if (piece.attrs.level !== undefined) element.dataset.level = String(piece.attrs.level);
      if (piece.indent > 0) element.style.setProperty('--quoin-ai-indent', String(piece.indent));
      const region = primaryRegion(schema, piece);
      if (region === null) element.textContent = toPlainText([codec.toQuoin(piece)], { schema });
      else renderInline(element, piece.regions[region], []);
      drawn.push(element);
    }
  }
  ghost.replaceChildren(...drawn);
}
