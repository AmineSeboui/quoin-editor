import type { Decoration, Editor, Inline } from '../../engine';
import { renderInline, type RenderOptions } from '../dom/render-inline';
import { sameDecorations } from './host-decorations';
import type { HostEntry } from './host-registry';
import { regionInline } from './region-inline';

export type HostRenderer = {
  /** Draws the host again, and says whether only its decorations changed. */
  render(host: HostEntry): boolean;
  renderIfChanged(host: HostEntry): void;
};

type Rendered = { readonly inline: Inline; readonly decorations: readonly Decoration[] };

export function createHostRenderer(
  editor: Editor,
  options: RenderOptions | undefined,
  decorationsOf: (block: string, region: string) => readonly Decoration[],
  afterRender: (element: HTMLElement) => void,
): HostRenderer {
  const rendered = new WeakMap<HTMLElement, Rendered>();

  function paint(host: HostEntry, always: boolean): boolean {
    const inline = regionInline(editor.state, host.block, host.region);
    if (inline === undefined) return false;
    const decorations = decorationsOf(host.block, host.region);
    const last = rendered.get(host.element);
    const restyled = last?.inline === inline && !sameDecorations(last.decorations, decorations);
    if (!always && last?.inline === inline && !restyled) return false;
    renderInline(host.element, inline, decorations, options);
    afterRender(host.element);
    rendered.set(host.element, { inline, decorations });
    return restyled;
  }

  return {
    render: (host) => paint(host, true),
    renderIfChanged: (host) => void paint(host, false),
  };
}
