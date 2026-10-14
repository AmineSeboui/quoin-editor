import type { Decoration, Editor, Inline } from '../../engine';
import { renderInline, type RenderOptions } from '../dom/render-inline';
import { sameDecorations } from './host-decorations';
import type { HostEntry } from './host-registry';
import { regionInline } from './region-inline';

export type HostRenderer = {
  render(host: HostEntry): void;
  renderIfChanged(host: HostEntry): void;
};

type Rendered = { readonly inline: Inline; readonly decorations: readonly Decoration[] };

export function createHostRenderer(
  editor: Editor,
  options: RenderOptions | undefined,
  decorationsOf: (block: string, region: string) => readonly Decoration[],
): HostRenderer {
  const rendered = new WeakMap<HTMLElement, Rendered>();

  function paint(host: HostEntry, always: boolean): void {
    const inline = regionInline(editor.state, host.block, host.region);
    if (inline === undefined) return;
    const decorations = decorationsOf(host.block, host.region);
    const last = rendered.get(host.element);
    if (!always && last?.inline === inline && sameDecorations(last.decorations, decorations)) return;
    renderInline(host.element, inline, decorations, options);
    rendered.set(host.element, { inline, decorations });
  }

  return {
    render: (host) => paint(host, true),
    renderIfChanged: (host) => paint(host, false),
  };
}
