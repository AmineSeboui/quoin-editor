import { sanitizeHref } from '../markdown/urls';
import type { Inline } from '../model/types';
import { child, emit, type Context, type Sink } from './html-context';
import { inlineFromNodes } from './html-inline';

const INLINE_PICTURE = /^data:image\//i;

// A picture carried inline in a data address stands as an empty image block, for a paste to take back out and upload.
// fromHTML has nothing to upload it to, so it leaves the picture out.
export function imageBlock(img: Element, caption: Inline, ctx: Context, sink: Sink): void {
  const src = (img.getAttribute('src') ?? '').trim();
  const alt = img.getAttribute('alt') ?? '';
  const url = sanitizeHref(src);
  if (sink.pictures && INLINE_PICTURE.test(src)) sink.pictures.push(src);
  else if (url === null || url === '') return;
  emit(sink, 'IMAGE', ctx.indent, url ? { storageKey: '', alt, url } : { storageKey: '', alt }, { caption });
}

export function figure(element: Element, ctx: Context, sink: Sink): void {
  const img = element.querySelector('img');
  if (img === null) {
    sink.walk(element.childNodes, child(ctx));
    return;
  }
  const caption = element.querySelector('figcaption');
  imageBlock(img, caption === null ? [] : inlineFromNodes(caption.childNodes, ctx), ctx, sink);
}
