import { normalizeInline, text } from '../model/inline';
import type { Inline, Mark } from '../model/types';
import { ELEMENT_NODE, flatText, isBlockTag, isDropped, isElement, MAX_DEPTH, tagName, TEXT_NODE } from './html-dom';
import type { Context } from './html-context';
import { elementMarks } from './html-marks';
import { keepsWhitespace, parseStyle } from './html-styles';
import { hoistEdgeSpaces, type Piece } from './hoist-spaces';

type Accumulator = { pieces: Piece[]; pendingBreak: boolean };

export type InlineStyle = Pick<Context, 'marks' | 'preformatted'>;

const COLLAPSIBLE = /[ \t\n\r\f]+/g;
const MSO_IGNORED = 'mso-list:ignore';

export function isMsoIgnored(element: Element): boolean {
  return (element.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '').includes(MSO_IGNORED);
}

function lastChar({ pieces }: Accumulator): string {
  const last = pieces[pieces.length - 1];
  return last === undefined ? '' : last.text[last.text.length - 1];
}

function trimEndSpace({ pieces }: Accumulator): void {
  const last = pieces[pieces.length - 1];
  if (last === undefined || !last.text.endsWith(' ')) return;
  const trimmed = last.text.slice(0, -1);
  if (trimmed === '') pieces.pop();
  else pieces[pieces.length - 1] = { ...last, text: trimmed };
}

function addBreak(acc: Accumulator, marks: readonly Mark[], preformatted: boolean): void {
  acc.pendingBreak = false;
  if (acc.pieces.length === 0) return;
  if (!preformatted) trimEndSpace(acc);
  acc.pieces.push({ text: '\n', marks });
}

function append(acc: Accumulator, raw: string, marks: readonly Mark[], preformatted: boolean): void {
  let value = preformatted ? raw.replace(/\r\n?/g, '\n') : raw.replace(COLLAPSIBLE, ' ');
  if (value === '') return;
  if (acc.pendingBreak) {
    if (lastChar(acc) !== '\n') addBreak(acc, marks, preformatted);
    acc.pendingBreak = false;
  }
  const before = lastChar(acc);
  if (!preformatted && (before === '' || before === '\n' || before === ' ')) value = value.replace(/^ /, '');
  if (value !== '') acc.pieces.push({ text: value, marks });
}

function finish({ pieces }: Accumulator): Inline {
  while (pieces.length > 0) {
    const last = pieces[pieces.length - 1];
    const trimmed = last.text.replace(/[ \n]+$/, '');
    if (trimmed === '') pieces.pop();
    else {
      pieces[pieces.length - 1] = { ...last, text: trimmed };
      break;
    }
  }
  const inline = normalizeInline(hoistEdgeSpaces(pieces).map((piece) => text(piece.text, piece.marks)));
  return inline.every((node) => node.kind === 'text' && node.text.trim() === '') ? [] : inline;
}

function visit(acc: Accumulator, node: Node, style: InlineStyle, depth: number): void {
  const { marks, preformatted } = style;
  if (node.nodeType === TEXT_NODE) return append(acc, node.nodeValue ?? '', marks, preformatted);
  if (node.nodeType !== ELEMENT_NODE || !isElement(node) || isDropped(node) || isMsoIgnored(node)) return;
  const tag = tagName(node);
  if (tag === 'br') return addBreak(acc, marks, preformatted);
  if (tag === 'img') return;
  const next = {
    marks: elementMarks(node, marks),
    preformatted: keepsWhitespace(parseStyle(node.getAttribute('style'))) ?? preformatted,
  };
  if (depth > MAX_DEPTH) return append(acc, flatText(node), next.marks, next.preformatted);
  const block = isBlockTag(node);
  if (block) acc.pendingBreak = true;
  for (const child of Array.from(node.childNodes)) visit(acc, child, next, depth + 1);
  if (block) acc.pendingBreak = true;
}

export function inlineFromNodes(nodes: Iterable<Node>, style: InlineStyle): Inline {
  const acc: Accumulator = { pieces: [], pendingBreak: false };
  for (const node of nodes) visit(acc, node, style, 0);
  return finish(acc);
}
