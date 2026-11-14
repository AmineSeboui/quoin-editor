import { createCanvas, type PageCanvas } from '../paint/page-canvas';
import { createResources, type Resources } from '../paint/resources';
import type { Box, Frame } from './box';

export type Margins = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

export type PageGeometry = { readonly width: number; readonly height: number; readonly margin: Margins };

export type Anchor = { readonly page: number; readonly top: number };

export type Pagination = { readonly pages: PageCanvas[]; readonly anchors: Map<string, Anchor>; readonly resources: Resources };

// A box kept with the next one needs the room of the boxes up to the first that is not kept, gaps included.
function keptHeight(boxes: readonly Box[], from: number): number {
  let height = 0;
  for (let at = from; at < boxes.length; at++) {
    height += boxes[at].height;
    if (!boxes[at].keepWithNext && !boxes[at].gap) break;
  }
  return height;
}

function paintFrame(canvas: PageCanvas, frame: Frame, top: number, bottom: number): void {
  if (frame.fill) canvas.fillRect(frame.x, top, frame.width, bottom - top, frame.fill);
  if (frame.bar) canvas.fillRect(frame.x, top, frame.bar.width, bottom - top, frame.bar.color);
}

/** Stacks the boxes on pages between the margins, breaking to a new page between boxes. */
export function paginate(boxes: readonly Box[], geometry: PageGeometry, resources: Resources = createResources()): Pagination {
  const { margin, height } = geometry;
  const bottom = height - margin.bottom;
  const room = bottom - margin.top;
  const pages: PageCanvas[] = [];
  const anchors = new Map<string, Anchor>();
  let canvas = createCanvas(height, resources);
  let y = margin.top;
  let empty = true;
  let extents = new Map<Frame, [number, number]>();
  const close = () => {
    const spans = [...extents];
    canvas.behind(() => spans.forEach(([frame, [top, end]]) => paintFrame(canvas, frame, top, end)));
  };
  const open = () => {
    canvas = createCanvas(height, resources);
    pages.push(canvas);
    y = margin.top;
    empty = true;
    extents = new Map();
  };
  const take = (box: Box) => {
    for (const frame of box.frames ?? []) extents.set(frame, [extents.get(frame)?.[0] ?? y, y + box.height]);
    y += box.height;
  };
  open();
  boxes.forEach((box, at) => {
    if (box.gap) {
      if (empty) return;
      if (y + box.height > bottom) {
        close();
        open();
      } else take(box);
      return;
    }
    const kept = keptHeight(boxes, at);
    if (!empty && y + (kept <= room ? kept : box.height) > bottom) {
      close();
      open();
    }
    box.paint?.(canvas, y);
    if (box.anchor !== undefined) anchors.set(box.anchor, { page: pages.length - 1, top: y });
    take(box);
    empty = false;
  });
  close();
  return { pages, anchors, resources };
}
