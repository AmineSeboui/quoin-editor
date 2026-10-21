import type { AtomRenderer } from '../../view';
import type { MathFeature } from './math-feature';
import { renderedMath } from './rendered-math';

/** Draws a math atom: the host's HTML for its LaTeX inline, or else the LaTeX itself as text. */
export function inlineMathRenderer({ labels, renderMath }: MathFeature): AtomRenderer {
  return (node, doc) => {
    const element = doc.createElement('span');
    const latex = node.attrs.latex ?? '';
    const html = latex === '' ? null : renderedMath(renderMath, latex, false);
    element.className = 'quoin-math-inline';
    if (html !== null) element.innerHTML = html;
    else {
      element.classList.add(latex === '' ? 'quoin-math-empty' : 'quoin-math-source');
      element.textContent = latex === '' ? labels.emptyEquation : latex;
    }
    return element;
  };
}
