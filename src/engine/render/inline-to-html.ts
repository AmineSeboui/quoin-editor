import { dataAttributes } from '../markdown/inline/html-marks';
import { sanitizeHref } from '../markdown/urls';
import { sameMark } from '../model/marks';
import type { AtomNode, Inline, Mark } from '../model/types';
import { escapeHtml } from './escape-html';
import { element, openTag, type Attr } from './html-tag';
import { PLAIN_MARK_TAGS } from './plain-mark-tags';

export type InlineHtmlOptions = {
  renderMath?: (latex: string, options: { displayMode: boolean }) => string;
};

type Wrapper = { readonly open: string; readonly close: string };

const wrap = (name: string, attrs: readonly Attr[] = []): Wrapper => ({
  open: openTag(name, attrs),
  close: `</${name}>`,
});

function markWrapper(mark: Mark): Wrapper | null {
  const plain = PLAIN_MARK_TAGS.get(mark.type);
  if (plain) return wrap(plain);
  const attrs = mark.attrs ?? {};
  switch (mark.type) {
    case 'link': {
      const href = sanitizeHref(attrs.href ?? '');
      return href === null ? null : wrap('a', [['href', href], ['title', attrs.title], ['rel', 'noopener noreferrer']]);
    }
    case 'comment':
      return wrap('span', [['data-comment', attrs.id ?? '']]);
    case 'highlight':
      return wrap('mark', [['data-color', attrs.color || undefined]]);
    case 'color':
      return wrap('span', [['data-color', attrs.color ?? '']]);
    case 'background':
      return wrap('span', [['data-bg', attrs.color ?? '']]);
    default:
      return wrap('span', [['data-mark', mark.type], ...dataAttributes(attrs)]);
  }
}

function atomHTML(node: AtomNode, options: InlineHtmlOptions): string {
  const { attrs } = node;
  if (node.type === 'mention') {
    const attributes: Attr[] = [['data-mention', attrs.id ?? ''], ['data-kind', attrs.kind || undefined]];
    return element('span', attributes, `@${escapeHtml(attrs.label ?? '')}`);
  }
  if (node.type === 'math') {
    const latex = attrs.latex ?? '';
    const body = options.renderMath ? options.renderMath(latex, { displayMode: false }) : escapeHtml(latex);
    return element('span', [['data-math', '']], body);
  }
  return element('span', [['data-atom', node.type], ...dataAttributes(attrs)], '');
}

const textHTML = (value: string): string => escapeHtml(value).replace(/\n/g, '<br>');

// Marks arrive sorted by rank, so keeping the longest shared prefix of open marks nests them in rank order.
// A link with an unsafe href is dropped but still takes its place in the open list.
export function inlineToHTML(inline: Inline, options: InlineHtmlOptions = {}): string {
  let html = '';
  const open: { readonly mark: Mark; readonly close: string }[] = [];
  for (const node of inline) {
    let shared = 0;
    while (shared < open.length && shared < node.marks.length && sameMark(open[shared].mark, node.marks[shared])) {
      shared++;
    }
    while (open.length > shared) html += (open.pop() as { close: string }).close;
    for (const mark of node.marks.slice(shared)) {
      const wrapper = markWrapper(mark);
      html += wrapper?.open ?? '';
      open.push({ mark, close: wrapper?.close ?? '' });
    }
    html += node.kind === 'text' ? textHTML(node.text) : atomHTML(node, options);
  }
  while (open.length > 0) html += (open.pop() as { close: string }).close;
  return html;
}
