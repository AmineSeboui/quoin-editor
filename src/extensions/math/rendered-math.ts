import { devWarn } from '../../dev-warn';
import type { RenderMath } from './math-feature';

function attempt(renderMath: RenderMath, latex: string, displayMode: boolean): unknown {
  try {
    return renderMath(latex, { displayMode });
  } catch {
    return undefined;
  }
}

/**
 * The host's HTML for the LaTeX, or null when there is no renderer, or it throws or returns anything but a string
 * with something in it, which would draw nothing to see or to click.
 */
export function renderedMath(renderMath: RenderMath | undefined, latex: string, displayMode: boolean): string | null {
  if (renderMath === undefined) return null;
  const html = attempt(renderMath, latex, displayMode);
  if (typeof html === 'string' && html.trim() !== '') return html;
  devWarn('renderMath threw or returned no HTML, so the equation shows its LaTeX source instead.');
  return null;
}
