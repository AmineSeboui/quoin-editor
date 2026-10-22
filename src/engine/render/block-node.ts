import { str } from '../blocks/data-fields';
import type { EngineBlock } from '../model/types';
import { alignAttr, colorAttrs, indentAttr } from './block-attrs';
import { headingId, headingLevel } from './headings';
import { inlineOf, type BlockView, type HtmlEnv } from './html-env';
import { element, type Attr, type HtmlNode } from './html-node';
import { bookmarkNode, embedNode, fileNode, imageNode } from './media-nodes';
import { tableNode } from './table-node';
import { tocNode } from './toc-node';

// A list item and a quote line come out as bare `li` and `p`, and the group around them adds the list or blockquote.
function lineNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const body = inlineOf(block.regions.text, env);
  const style: Attr[] = [alignAttr(block.attrs.align), ...colorAttrs(block.attrs), indentAttr(view.excess)];
  switch (block.attrs.kind) {
    case 'heading':
      return element(`h${headingLevel(block) ?? 1}`, [['id', headingId(block.id)], ...style], body);
    case 'bullet':
    case 'ordered':
      return element('li', style, [...body, ...view.children]);
    case 'task': {
      const checked = block.attrs.checked === true;
      const box = element('input', [['type', 'checkbox'], ['disabled', true], ['checked', checked || undefined]]);
      return element('li', [['data-checked', String(checked)], ...style], [box, ' ', ...body, ...view.children]);
    }
    default:
      return element('p', style, body);
  }
}

function calloutNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const icon = str(block.attrs.icon);
  const mark = icon === '' ? [] : [element('span', [['data-icon', '']], [icon])];
  const body = element('p', [], inlineOf(block.regions.body, env));
  return element('aside', [['data-tone', str(block.attrs.tone)], indentAttr(view.excess)], [...mark, body]);
}

function codeNode(block: EngineBlock, view: BlockView): HtmlNode {
  const language = str(block.attrs.language);
  const className = language === '' ? undefined : `language-${language}`;
  const code = element('code', [['class', className]], [str(block.attrs.code)]);
  return element('pre', [indentAttr(view.excess)], [code]);
}

function mathNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const latex = str(block.attrs.latex);
  if (!env.renderMath) return element('pre', [indentAttr(view.excess)], [latex]);
  return element('div', [['data-math', ''], indentAttr(view.excess)], [], env.renderMath(latex, { displayMode: true }));
}

function toggleNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const summary = element('summary', [], inlineOf(block.regions.text, env));
  const attrs: Attr[] = [['open', block.attrs.open === true || undefined], indentAttr(view.excess)];
  return element('details', attrs, [summary, ...view.children]);
}

export function blockNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  switch (block.type) {
    case 'MARKDOWN':
      return lineNode(block, view, env);
    case 'CALLOUT':
      return calloutNode(block, view, env);
    case 'CODE':
      return codeNode(block, view);
    case 'IMAGE':
      return imageNode(block, view, env);
    case 'FILE':
      return fileNode(block, view, env);
    case 'DIVIDER':
      return element('hr', [indentAttr(view.excess)]);
    case 'TOGGLE':
      return toggleNode(block, view, env);
    case 'TABLE':
      return tableNode(block, view, env);
    case 'EMBED':
      return embedNode(block, view, env);
    case 'BOOKMARK':
      return bookmarkNode(block, view);
    case 'MATH':
      return mathNode(block, view, env);
    case 'TOC':
      return tocNode(env.headings, view.excess);
    default:
      return element('div', [['data-type', block.type], indentAttr(view.excess)]);
  }
}
