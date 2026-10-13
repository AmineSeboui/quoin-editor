import { str } from '../../blocks/data-fields';
import { text } from '../../model/inline';
import type { MarkdownExportContext } from '../../schema/types';
import { linkClose } from '../inline/link-markdown';

type Data = Record<string, unknown>;

const oneLine = (value: string): string => value.replace(/[\r\n]+/g, ' ');

function linked(label: string, href: string, ctx: MarkdownExportContext): string {
  return ctx.inline.serialize([text(label || href, [{ type: 'link', attrs: { href } }])]);
}

const assetUrl = (storageKey: string, ctx: MarkdownExportContext): string =>
  storageKey === '' ? '' : ctx.resolveAssetUrl(storageKey);

export function imageMarkdown(data: Data, ctx: MarkdownExportContext): string | null {
  const href = str(data.url) || assetUrl(str(data.storageKey), ctx);
  if (href === '') return null;
  const caption = str(data.caption);
  const alt = ctx.inline.serialize([text(oneLine(str(data.alt)))]);
  return `![${alt}${linkClose({ type: 'link', attrs: caption ? { href, title: caption } : { href } }, false)}`;
}

export function fileMarkdown(data: Data, ctx: MarkdownExportContext): string | null {
  const href = assetUrl(str(data.storageKey), ctx);
  return href === '' ? null : linked(oneLine(str(data.filename)), href, ctx);
}

export function embedMarkdown(data: Data, ctx: MarkdownExportContext): string | null {
  const url = str(data.url);
  return url === '' ? null : linked(url, url, ctx);
}

export function bookmarkMarkdown(data: Data, ctx: MarkdownExportContext): string | null {
  const url = str(data.url);
  return url === '' ? null : linked(oneLine(str(data.title)), url, ctx);
}
