import { highlightedLines, type CodeHighlighter } from '../blocks/code/code-highlighter';
import { tokenColour } from '../blocks/code/token-colour';
import { str } from '../engine/blocks/data-fields';
import type { EngineBlock } from '../engine/model/types';
import { element, type HtmlElement, type HtmlNode } from '../engine/render/html-node';

const colourStyle = (color: string | undefined) => tokenColour(color) && `color:${color}`;

/**
 * The `pre` toHTML writes for a code block, with its code drawn as the highlighter's tokens. Unchanged without a
 * highlighter or when its tokens do not spell the code.
 */
export function highlightedCode(pre: HtmlElement, block: EngineBlock, highlight: CodeHighlighter | undefined): HtmlElement {
  const lines = highlightedLines(highlight, str(block.attrs.code), str(block.attrs.language));
  const code = pre.children[0];
  if (lines === null || typeof code === 'string') return pre;
  const tokens = lines.flatMap((line, index): HtmlNode[] => [
    ...(index > 0 ? ['\n'] : []),
    ...line.map(({ text, color, className }) =>
      element('span', [['style', colourStyle(color)], ['class', className]], [text]),
    ),
  ]);
  return element(pre.tag, pre.attrs, [element(code.tag, code.attrs, tokens)]);
}
