import { devWarn } from '../../dev-warn';
import type { RenderDiagram } from './diagram-feature';

function attempt(render: RenderDiagram, code: string, language: string): unknown {
  try {
    return render(code, language);
  } catch {
    return undefined;
  }
}

/**
 * The host's markup for a diagram, or null when there is no renderer, or it throws or gives anything but markup with
 * something in it. Null leaves the block showing its source, which is what the document holds anyway.
 */
export function renderedDiagram(
  render: RenderDiagram | undefined,
  code: string,
  language: string,
): string | null {
  if (render === undefined) return null;
  const markup = attempt(render, code, language);
  if (typeof markup === 'string' && markup.trim() !== '') return markup;
  devWarn('render threw or drew nothing, so the diagram block shows its source instead.');
  return null;
}
