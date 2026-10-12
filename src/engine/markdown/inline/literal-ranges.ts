import { codeSpan } from './code-markdown';
import type { Child, Range } from './inline-tree';
import { autolinkMarkdown } from './link-markdown';
import type { RenderOptions } from './render-options';

function allText(children: readonly Child[]): string | null {
  let content = '';
  for (const child of children) {
    if (child.kind !== 'leaf' || child.node.kind !== 'text') return null;
    content += child.node.text;
  }
  return content;
}

export function autolinkOf(range: Range, options: RenderOptions): string | null {
  const text = options.strict || range.mark.type !== 'link' ? null : allText(range.children);
  if (text === null || (options.escapePipes && text.includes('|'))) return null;
  return autolinkMarkdown(text, range.mark);
}

function codeSpanOf(range: Range, options: RenderOptions): string | null {
  const content = range.mark.type === 'code' ? allText(range.children) : null;
  if (content === null || (options.escapePipes && content.includes('|'))) return null;
  return codeSpan(content);
}

export function renderLiteral(range: Range, options: RenderOptions): string | null {
  return autolinkOf(range, options) ?? codeSpanOf(range, options);
}
