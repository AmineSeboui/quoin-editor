import { str } from '../blocks/data-fields';
import type { EngineBlock } from '../model/types';
import { alignAttr, colorAttrs, indentAttr } from './block-attrs';
import { escapeHtml } from './escape-html';
import { headingId, headingLevel } from './headings';
import { inlineHTML, type BlockView, type HtmlEnv } from './html-env';
import { element, openTag, type Attr } from './html-tag';
import { bookmarkHTML, embedHTML, fileHTML, imageHTML } from './media-html';
import { tableHTML } from './table-html';
import { tocToHTML } from './toc-html';

// A list item and a quote line come out as bare `li` and `p`, and the group around them adds the list or blockquote.
function lineHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const body = inlineHTML(block.regions.text, env);
  const style: Attr[] = [alignAttr(block.attrs.align), ...colorAttrs(block.attrs), indentAttr(view.excess)];
  switch (block.attrs.kind) {
    case 'heading':
      return element(`h${headingLevel(block) ?? 1}`, [['id', headingId(block.id)], ...style], body);
    case 'bullet':
    case 'ordered':
      return element('li', style, body + view.children);
    case 'task': {
      const checked = block.attrs.checked === true;
      const box = openTag('input', [['type', 'checkbox'], ['disabled', true], ['checked', checked || undefined]]);
      return element('li', [['data-checked', String(checked)], ...style], `${box} ${body}${view.children}`);
    }
    default:
      return element('p', style, body);
  }
}

function calloutHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const icon = str(block.attrs.icon);
  const mark = icon === '' ? '' : element('span', [['data-icon', '']], escapeHtml(icon));
  const body = element('p', [], inlineHTML(block.regions.body, env));
  return element('aside', [['data-tone', str(block.attrs.tone)], indentAttr(view.excess)], mark + body);
}

function codeHTML(block: EngineBlock, view: BlockView): string {
  const language = str(block.attrs.language);
  const className = language === '' ? undefined : `language-${language}`;
  const code = element('code', [['class', className]], escapeHtml(str(block.attrs.code)));
  return element('pre', [indentAttr(view.excess)], code);
}

function mathHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const latex = str(block.attrs.latex);
  if (!env.renderMath) return element('pre', [indentAttr(view.excess)], escapeHtml(latex));
  return element('div', [['data-math', ''], indentAttr(view.excess)], env.renderMath(latex, { displayMode: true }));
}

function toggleHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const summary = element('summary', [], inlineHTML(block.regions.text, env));
  const attrs: Attr[] = [['open', block.attrs.open === true || undefined], indentAttr(view.excess)];
  return element('details', attrs, summary + view.children);
}

export function blockToHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  switch (block.type) {
    case 'MARKDOWN':
      return lineHTML(block, view, env);
    case 'CALLOUT':
      return calloutHTML(block, view, env);
    case 'CODE':
      return codeHTML(block, view);
    case 'IMAGE':
      return imageHTML(block, view, env);
    case 'FILE':
      return fileHTML(block, view, env);
    case 'DIVIDER':
      return openTag('hr', [indentAttr(view.excess)]);
    case 'TOGGLE':
      return toggleHTML(block, view, env);
    case 'TABLE':
      return tableHTML(block, view, env);
    case 'EMBED':
      return embedHTML(block, view, env);
    case 'BOOKMARK':
      return bookmarkHTML(block, view);
    case 'MATH':
      return mathHTML(block, view, env);
    case 'TOC':
      return tocToHTML(env.headings, view.excess);
    default:
      return element('div', [['data-type', block.type], indentAttr(view.excess)], '');
  }
}
