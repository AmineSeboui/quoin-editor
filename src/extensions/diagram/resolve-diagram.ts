import { devWarn } from '../../dev-warn';
import type { RenderDiagram } from './diagram-feature';

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as Promise<unknown>).then === 'function';

function checked(markup: unknown): string | null {
  if (typeof markup === 'string' && markup.trim() !== '') return markup;
  devWarn('render drew nothing, so the diagram block shows its source instead.');
  return null;
}

/**
 * The host's markup for a diagram, or null when there is no renderer, or it throws, rejects, or gives anything but
 * markup with something in it. A renderer may answer at once or with a promise, because the common engines parse and
 * lay out asynchronously. Null leaves the block showing its source, which is what the document holds anyway.
 */
export async function resolveDiagram(
  render: RenderDiagram | undefined,
  code: string,
  language: string,
): Promise<string | null> {
  if (render === undefined) return null;
  try {
    const answer: unknown = render(code, language);
    return checked(isPromise(answer) ? await answer : answer);
  } catch {
    devWarn('render threw or rejected, so the diagram block shows its source instead.');
    return null;
  }
}
