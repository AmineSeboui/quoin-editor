import { optionalNumber, str } from '../blocks/data-fields';
import { sanitizeAssetUrl, sanitizeHref } from '../markdown/urls';
import type { EngineBlock } from '../model/types';
import { alignAttr, indentAttr } from './block-attrs';
import { EMBED_FRAME, embedSource } from './embed-provider';
import { escapeHtml } from './escape-html';
import { inlineHTML, type BlockView, type HtmlEnv } from './html-env';
import { element, openTag, type Attr } from './html-tag';

const numberAttr = (value: unknown): string | undefined => {
  const number = optionalNumber(value);
  return number === undefined ? undefined : String(number);
};

const paragraph = (view: BlockView, inner: string): string => element('p', [indentAttr(view.excess)], inner);

const link = (href: string, label: string): string =>
  element('a', [['href', href], ['rel', 'noopener noreferrer']], escapeHtml(label));

function assetSource(block: EngineBlock, env: HtmlEnv): string | null {
  const key = str(block.attrs.storageKey);
  const src = key === '' ? null : env.resolveAssetUrl(key);
  return src ? sanitizeAssetUrl(src) : null;
}

function imageSource(block: EngineBlock, env: HtmlEnv): string | null {
  const url = str(block.attrs.url);
  return url === '' ? assetSource(block, env) : sanitizeHref(url);
}

export function imageHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const src = imageSource(block, env);
  if (!src) return '';
  const { attrs } = block;
  const image = openTag('img', [
    ['src', src],
    ['alt', str(attrs.alt)],
    ['width', numberAttr(attrs.width)],
    ['height', numberAttr(attrs.height)],
  ]);
  const caption = block.regions.caption ?? [];
  const figcaption = caption.length > 0 ? element('figcaption', [], inlineHTML(caption, env)) : '';
  return element('figure', [alignAttr(attrs.align), indentAttr(view.excess)], image + figcaption);
}

export function fileHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const href = assetSource(block, env);
  if (!href) return '';
  const attrs: Attr[] = [['href', href], ['download', true]];
  return paragraph(view, element('a', attrs, escapeHtml(str(block.attrs.filename))));
}

export function embedHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const href = sanitizeHref(str(block.attrs.url));
  if (!href) return '';
  const frame = env.embeds === 'iframe' ? embedSource(href, env.embedProviders) : null;
  if (frame) {
    return element('iframe', [['src', frame], ...Object.entries(EMBED_FRAME), indentAttr(view.excess)], '');
  }
  return paragraph(view, link(href, href));
}

export function bookmarkHTML(block: EngineBlock, view: BlockView): string {
  const href = sanitizeHref(str(block.attrs.url));
  return href ? paragraph(view, link(href, str(block.attrs.title) || href)) : '';
}
