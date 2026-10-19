import { devWarn } from '../../dev-warn';

/** A run of code drawn in one colour or class. Its text is drawn as text, never parsed as markup. */
export type CodeToken = { text: string; color?: string; className?: string };

/**
 * Highlights the code of a code block: one array of tokens per line of `code`, split on `\n`, whose texts put together
 * spell the line exactly, since the tokens are drawn under the text the writer types into. Wrap any highlighter, such as
 * Shiki, Prism or highlight.js, in one. `language` is the block's language as stored, which may be an alias such as `ts`.
 */
export type CodeHighlighter = (code: string, language: string) => CodeToken[][];

const spelled = (lines: readonly CodeToken[][]): string =>
  lines.map((line) => line.map((token) => token.text).join('')).join('\n');

function tokensOf(highlight: CodeHighlighter, code: string, language: string): CodeToken[][] | null {
  try {
    return highlight(code, language);
  } catch {
    return null;
  }
}

/** The tokens to draw, or null for plain text: without a highlighter, or when its tokens would misplace the code. */
export function highlightedLines(highlight: CodeHighlighter | undefined, code: string, language: string): CodeToken[][] | null {
  if (highlight === undefined) return null;
  const lines = tokensOf(highlight, code, language);
  if (lines !== null && spelled(lines) === code) return lines;
  devWarn('`highlight` failed or its tokens do not spell the code; it is drawn as plain text.');
  return null;
}
