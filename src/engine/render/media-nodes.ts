import { optionalNumber, str } from '../blocks/data-fields';
import { sanitizeAssetUrl, sanitizeHref } from '../markdown/urls';
import type { EngineBlock } from '../model/types';
import { alignAttr, indentAttr } from './block-attrs';
import { EMBED_FRAME, embedSource } from './embed-provider';
import { inlineOf, type BlockView, type HtmlEnv } from './html-env';
import { element, type HtmlNode } from './html-node';

const numberAttr = (value: unknown): string | undefined => {
  const number = optionalNumber(value);
  return number === undefined ? undefined : String(number);
};

const paragraph = (view: BlockView, inner: HtmlNode): HtmlNode => element('p', [indentAttr(view.excess)], [inner]);

const link = (href: string, label: string): HtmlNode => element('a', [['href', href], ['rel', 'noopener noreferrer']], [label]);

function assetSource(block: EngineBlock, env: HtmlEnv): string | null {
  const key = str(block.attrs.storageKey);
  const src = key === '' ? null : env.resolveAssetUrl(key);
  return src ? sanitizeAssetUrl(src) : null;
}

function imageSource(block: EngineBlock, env: HtmlEnv): string | null {
  const url = str(block.attrs.url);
  return url === '' ? assetSource(block, env) : sanitizeHref(url);
}

export function imageNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const src = imageSource(block, env);
  if (!src) return '';
  const { attrs } = block;
  const image = element('img', [
    ['src', src],
    ['alt', str(attrs.alt)],
    ['width', numberAttr(attrs.width)],
    ['height', numberAttr(attrs.height)],
  ]);
  const caption = block.regions.caption ?? [];
  const figcaption = caption.length > 0 ? [element('figcaption', [], inlineOf(caption, env))] : [];
  return element('figure', [alignAttr(attrs.align), indentAttr(view.excess)], [image, ...figcaption]);
}

export function fileNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const href = assetSource(block, env);
  if (!href) return '';
  return paragraph(view, element('a', [['href', href], ['download', true]], [str(block.attrs.filename)]));
}

export function embedNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const href = sanitizeHref(str(block.attrs.url));
  if (!href) return '';
  const frame = env.embeds === 'iframe' ? embedSource(href, env.embedProviders) : null;
  if (frame) return element('iframe', [['src', frame], ['title', href], ...Object.entries(EMBED_FRAME), indentAttr(view.excess)]);
  return paragraph(view, link(href, href));
}

export function bookmarkNode(block: EngineBlock, view: BlockView): HtmlNode {
  const href = sanitizeHref(str(block.attrs.url));
  return href ? paragraph(view, link(href, str(block.attrs.title) || href)) : '';
}
