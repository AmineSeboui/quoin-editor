import { createBlockCodec, createSchema, fromMarkdown, toPlainText, type Decoration, type Schema } from '../../engine';
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
 * The answer as it streams, drawn from the engine's own reading of its markdown, inline content by the view's own
 * renderer, so nothing the host wrote is ever parsed as HTML. It is a widget of the document, not a part of it: the
 * view reads none of it back, and it takes no selection and no pointer.
 */
export function renderGhost(decoration: Extract<Decoration, { kind: 'widget' }>, doc: Document): HTMLElement {
  const ghost = doc.createElement('div');
  ghost.className = 'quoin-ai-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('data-phase', decoration.attrs.phase ?? '');
  const { schema, codec } = readerOf();
  for (const block of fromMarkdown(decoration.attrs.markdown ?? '')) {
    for (const piece of codec.toEngineBlocks(block)) {
      const element = doc.createElement('div');
      element.className = 'quoin-ai-ghost-block';
      element.dataset.kind = String(piece.attrs.kind ?? piece.type.toLowerCase());
      if (piece.attrs.level !== undefined) element.dataset.level = String(piece.attrs.level);
      if (piece.indent > 0) element.style.setProperty('--quoin-ai-indent', String(piece.indent));
      const region = primaryRegion(schema, piece);
      if (region === null) element.textContent = toPlainText([codec.toQuoin(piece)], { schema });
      else renderInline(element, piece.regions[region], []);
      ghost.append(element);
    }
  }
  return ghost;
}
