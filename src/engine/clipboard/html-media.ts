import { sanitizeHref } from '../markdown/urls';
import type { Inline } from '../model/types';
import { child, emit, type Context, type Sink } from './html-context';
import { inlineFromNodes } from './html-inline';

export function imageBlock(img: Element, caption: Inline, ctx: Context, sink: Sink): void {
  const url = sanitizeHref(img.getAttribute('src') ?? '');
  if (url === null || url === '') return;
  emit(sink, 'IMAGE', ctx.indent, { storageKey: '', alt: img.getAttribute('alt') ?? '', url }, { caption });
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
