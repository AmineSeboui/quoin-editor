import Prism from 'prismjs';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import type { CodeHighlighter, CodeToken } from 'quoin-editor';

const ALIASES: Record<string, string> = { ts: 'typescript', js: 'javascript', sh: 'bash', shell: 'bash' };

type Piece = { text: string; type?: string };

function flatten(stream: (string | Prism.Token)[], type?: string): Piece[] {
  return stream.flatMap((token): Piece[] => {
    if (typeof token === 'string') return [{ text: token, type }];
    const content = token.content;
    const inner = typeof content === 'string' ? [content] : Array.isArray(content) ? content : [content];
    return flatten(inner, token.type);
  });
}

function toLines(pieces: Piece[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  for (const { text, type } of pieces) {
    text.split('\n').forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part !== '') lines[lines.length - 1].push(type ? { text: part, className: `tok-${type}` } : { text: part });
    });
  }
  return lines;
}

/** Colours the code of the docs' code blocks with Prism, at build time only, as classes the site's stylesheet paints. */
export const highlight: CodeHighlighter = (code, language) => {
  const grammar = Prism.languages[ALIASES[language] ?? language];
  return toLines(grammar ? flatten(Prism.tokenize(code, grammar)) : [{ text: code }]);
};
