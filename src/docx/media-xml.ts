import { str } from '../engine/blocks/data-fields';
import type { EngineBlock } from '../engine/model/types';
import { assetUrl, pictureUrl } from './asset-source';
import type { DocxContext } from './docx-context';
import { drawingXml } from './drawing-xml';
import { indentOf, paragraphXml } from './paragraph-xml';
import { runsXml, runXml } from './runs-xml';
import { wordLink } from './word-link';
import { xmlElement } from './xml';

/** A paragraph of `text`, linked to `href` when Word can open it safely. */
export function linkParagraphXml(href: string | null, text: string, ctx: DocxContext, indent: number): string {
  const safe = href === null ? null : wordLink(href);
  const runs = safe ? xmlElement('w:hyperlink', { 'r:id': ctx.link(safe) }, runXml(text, { style: 'Hyperlink' })) : runXml(text);
  return paragraphXml({ indent: indentOf(indent) }, runs);
}

/** The picture, or its alt text when it could not be fetched, then its caption. */
export function imageXml(block: EngineBlock, ctx: DocxContext): string {
  const { attrs } = block;
  const alt = str(attrs.alt);
  const place = ctx.picture(pictureUrl(block, ctx.resolveAssetUrl));
  const props = { indent: indentOf(block.indent), align: attrs.align };
  const picture = place ? drawingXml(place, attrs, alt, ctx.drawingId()) : runXml(alt);
  const caption = block.regions.caption ?? [];
  return (
    (picture === '' ? '' : paragraphXml(props, picture)) +
    (caption.length > 0 ? paragraphXml({ ...props, style: 'Caption' }, runsXml(caption, ctx)) : '')
  );
}

export const fileXml = (block: EngineBlock, ctx: DocxContext): string =>
  linkParagraphXml(assetUrl(block, ctx.resolveAssetUrl), str(block.attrs.filename), ctx, block.indent);

export function webLinkXml(block: EngineBlock, ctx: DocxContext): string {
  const url = str(block.attrs.url);
  const text = block.type === 'BOOKMARK' ? str(block.attrs.title) || url : url;
  return url === '' ? '' : linkParagraphXml(url, text, ctx, block.indent);
}
