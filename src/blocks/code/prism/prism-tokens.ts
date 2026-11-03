import type { CodeToken } from '../code-highlighter';

/** A node of the tree `Prism.tokenize` returns: text, a token, or a run of either. */
export type PrismNode = string | PrismToken | readonly PrismNode[];
export type PrismToken = { type: string; content: PrismNode; alias?: string | readonly string[] };

// A grammar is data, so a type reaches a class name only as a plain word, never as whatever the grammar spelled.
const WORD = /^[a-z][a-z0-9-]*$/;

function className(token: PrismToken): string | undefined {
  const alias = typeof token.alias === 'string' ? token.alias : token.alias?.[0];
  const name = alias ?? token.type;
  return WORD.test(name) ? `quoin-tok-${name}` : undefined;
}

// The overlay draws one array per line of the code, so a token spanning lines is drawn as one run per line it covers.
function pushText(lines: CodeToken[][], text: string, drawn: string | undefined): void {
  text.split('\n').forEach((part, index) => {
    if (index > 0) lines.push([]);
    if (part === '') return;
    lines[lines.length - 1].push(drawn === undefined ? { text: part } : { text: part, className: drawn });
  });
}

function walk(node: PrismNode, drawn: string | undefined, lines: CodeToken[][]): void {
  if (typeof node === 'string') return pushText(lines, node, drawn);
  if (Array.isArray(node)) return (node as readonly PrismNode[]).forEach((child) => walk(child, drawn, lines));
  const token = node as PrismToken;
  walk(token.content, className(token) ?? drawn, lines);
}

/** The tokens of `Prism.tokenize`, as the lines the code overlay draws. The innermost token names a run it covers. */
export function codeLines(nodes: readonly PrismNode[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  nodes.forEach((node) => walk(node, undefined, lines));
  return lines;
}
