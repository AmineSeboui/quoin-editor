import type { Decoration, Editor, EditorState, Inline } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { renderInline, type RenderOptions } from '../dom/render-inline';
import { decorationsByHost, NO_DECORATIONS, sameDecorations } from './host-decorations';
import { hostKey, type HostEntry } from './host-registry';

export type HostRenderer = {
  render(host: HostEntry): void;
  renderIfChanged(host: HostEntry): void;
};

type Rendered = { readonly inline: Inline; readonly decorations: readonly Decoration[] };
type DecorationCache = { readonly state: EditorState; readonly byHost: ReadonlyMap<string, readonly Decoration[]> };

function regionOf(state: EditorState, block: string, region: string): Inline | undefined {
  const regions = blockById(state.doc, block)?.regions;
  return regions && Object.hasOwn(regions, region) ? regions[region] : undefined;
}

export function createHostRenderer(editor: Editor, options: RenderOptions | undefined): HostRenderer {
  const rendered = new WeakMap<HTMLElement, Rendered>();
  let cache: DecorationCache | null = null;

  function decorationsFor(state: EditorState, host: HostEntry): readonly Decoration[] {
    if (cache?.state !== state) cache = { state, byHost: decorationsByHost(editor.decorations()) };
    return cache.byHost.get(hostKey(host.block, host.region)) ?? NO_DECORATIONS;
  }

  function paint(host: HostEntry, always: boolean): void {
    const { state } = editor;
    const inline = regionOf(state, host.block, host.region);
    if (inline === undefined) return;
    const decorations = decorationsFor(state, host);
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
