import type { Decoration, Inline } from '../../engine';
import { inlineLength, inlineText } from '../../engine/model/inline';
import { atomSpec, widgetSpec } from './atom-specs';
import { createDomMap, type DomMap, type MapEntry } from './dom-map';
import { reconcileChildren } from './reconcile';
import type { RenderOptions } from './render-options';
import type { RenderSpec } from './render-spec';
import { toSegments, type Segment } from './segments';
import { fillerSpec, textSpecs } from './text-specs';

export type { DomMap, DomPoint } from './dom-map';
export type { AtomRenderer, RenderOptions, WidgetRenderer } from './render-options';

type HostState = { readonly map: DomMap; readonly options: RenderOptions };

const states = new WeakMap<HTMLElement, HostState>();
const rendering = new WeakSet<HTMLElement>();

export function domMapOf(host: HTMLElement): DomMap | undefined {
  return states.get(host)?.map;
}

export function isRendering(host: HTMLElement): boolean {
  return rendering.has(host);
}

function specsFor(segment: Segment, options: RenderOptions, doc: Document): RenderSpec[] {
  switch (segment.kind) {
    case 'text':
      return textSpecs(segment, doc);
    case 'atom':
      return [atomSpec(segment, options, doc)];
    case 'widget':
      return [widgetSpec(segment, options, doc)];
  }
}

// A trailing line break only shows a line when something follows it, so such a region ends with a filler.
function needsFiller(inline: Inline): boolean {
  const content = inlineText(inline);
  return content === '' || content.endsWith('\n');
}

// Kept nodes were built by the renderers of the previous call, so a changed renderer rebuilds them.
function sameRenderers(a: RenderOptions, b: RenderOptions): boolean {
  return a.atoms === b.atoms && a.widgets === b.widgets && a.atomText === b.atomText;
}

export function renderInline(
  host: HTMLElement,
  inline: Inline,
  decorations: readonly Decoration[],
  options: RenderOptions = {},
): DomMap {
  const doc = host.ownerDocument;
  rendering.add(host);
  try {
    const previous = states.get(host);
    if (previous && !sameRenderers(previous.options, options)) host.replaceChildren();
    const length = inlineLength(inline);
    const specs = toSegments(inline, decorations).flatMap((segment) => specsFor(segment, options, doc));
    if (needsFiller(inline)) specs.push(fillerSpec(doc, length));
    reconcileChildren(host, specs);
    const entries: MapEntry[] = [];
    const nodes = Array.from(host.childNodes);
    specs.forEach((spec, index) => spec.describe(nodes[index], entries));
    const map = createDomMap(host, length, entries);
    states.set(host, { map, options });
    return map;
  } finally {
    rendering.delete(host);
  }
}
