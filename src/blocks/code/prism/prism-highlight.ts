import type { CodeToken } from '../code-highlighter';
import { grammarName } from './grammar-name';
import { codeLines, type PrismNode } from './prism-tokens';

/** Tokenizes code against a named Prism grammar, or gives null when the grammar is not among those loaded. */
export type Tokenize = (code: string, grammar: string) => PrismNode[] | null;

// A grammar is a regular expression over text the writer controls, so a throw inside one draws the code plainly rather
// than losing the block.
function nodesOf(tokenize: Tokenize, code: string, grammar: string): PrismNode[] | null {
  try {
    return tokenize(code, grammar);
  } catch {
    return null;
  }
}

/** The lines to draw for a block: its grammar's tokens, or the code itself when no grammar covers the language. */
export function highlightWith(tokenize: Tokenize, code: string, language: string): CodeToken[][] {
  const grammar = grammarName(language);
  const nodes = grammar === undefined ? null : nodesOf(tokenize, code, grammar);
  return codeLines(nodes ?? [code]);
}
