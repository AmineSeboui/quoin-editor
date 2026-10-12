import type { AtomNode, Attrs } from '../../model/types';
import { sanitizeHref } from '../urls';
import { escapeText } from './escape-text';
import { dataAttributes, htmlTag } from './html-marks';
import { linkDestination } from './link-markdown';
import type { RenderOptions } from './render-options';

const MENTION_KEYS = new Set(['id', 'label', 'kind']);
const DIGIT = /[0-9]/;
const MATH_EDGE_HAZARD = /^\s|\s$|\\$/;

function hasMentionShape(attrs: Attrs): boolean {
  const { id, label, kind } = attrs;
  if (!Object.keys(attrs).every((key) => MENTION_KEYS.has(key))) return false;
  if (!id || label === undefined || (kind !== undefined && (!kind || kind.includes(':')))) return false;
  return kind !== undefined || !id.includes(':');
}

function mentionHref({ id, kind }: Attrs): string {
  return kind === undefined ? `mention:${id}` : `mention:${kind}:${id}`;
}

function mentionMarkdown(attrs: Attrs, options: RenderOptions): string {
  const label = escapeText(attrs.label, {
    lineStart: false,
    lineEnd: false,
    escapeLineStart: options.escapeLineStart,
    escapePipes: options.escapePipes,
    hardBreak: options.hardBreak,
    next: ']',
    previous: '@',
    following: ']',
  });
  return `[@${label}](${linkDestination(mentionHref(attrs), options.escapePipes)})`;
}

function isPrettyMath(attrs: Attrs, after: string, options: RenderOptions): boolean {
  const { latex } = attrs;
  if (Object.keys(attrs).length !== 1 || !latex || /[$\n]/.test(latex)) return false;
  if (options.escapePipes && latex.includes('|')) return false;
  return !MATH_EDGE_HAZARD.test(latex) && !DIGIT.test(after[0] ?? '');
}

// A mention is a link in markdown, and a link cannot sit inside another link.
export function writesMention(node: AtomNode, options: RenderOptions): boolean {
  if (options.strict || node.type !== 'mention' || !hasMentionShape(node.attrs)) return false;
  const href = mentionHref(node.attrs);
  return sanitizeHref(href) === href && !node.marks.some((mark) => mark.type === 'link');
}

export function atomMarkdown(node: AtomNode, after: string, options: RenderOptions): string {
  if (writesMention(node, options)) return mentionMarkdown(node.attrs, options);
  if (!options.strict && node.type === 'math' && isPrettyMath(node.attrs, after, options)) {
    return `$${node.attrs.latex}$`;
  }
  const attributes: [string, string][] = [['data-atom', node.type], ...dataAttributes(node.attrs)];
  const { open, close } = htmlTag('span', attributes, options.escapePipes);
  return open + close;
}
