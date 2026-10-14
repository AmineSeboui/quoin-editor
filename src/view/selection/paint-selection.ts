import { markRanges } from '../../engine/commands/selection-marks';
import type { ViewController } from '../controller/view-controller';
import { domMapOf } from '../dom/render-inline';
import { isCrossSelection, type PaintMode } from './selection-decorations';

export type Painter = { paint(controller: ViewController): void; clear(): void; readonly mode: PaintMode };

type RangeSet = { add(range: Range): unknown; delete(range: Range): unknown };
type HighlightRegistry = { get(name: string): unknown; set(name: string, highlight: unknown): unknown };
type HighlightConstructor = new (...ranges: Range[]) => RangeSet;
type HighlightWindow = { CSS?: { highlights?: HighlightRegistry }; Highlight?: HighlightConstructor };

const NAME = 'quoin-selection';

function coveredRanges(controller: ViewController): Range[] {
  return markRanges(controller.editor.state).flatMap(({ block, region, from, to }) => {
    const host = controller.registry.get(block, region);
    const map = host && domMapOf(host);
    if (!host || !map) return [];
    const start = map.toDom(from, 1);
    const end = map.toDom(to, -1);
    const range = host.ownerDocument.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return [range];
  });
}

// The registry belongs to the page, so every editor on it shares one highlight and each painter only takes back the
// ranges it added.
function highlightPainter(highlights: HighlightRegistry, Highlight: HighlightConstructor): Painter {
  let painted: Range[] = [];

  function shared(): RangeSet {
    const existing = highlights.get(NAME) as RangeSet | undefined;
    if (existing) return existing;
    const created = new Highlight();
    highlights.set(NAME, created);
    return created;
  }

  function clear(): void {
    if (painted.length === 0) return;
    const highlight = shared();
    for (const range of painted) highlight.delete(range);
    painted = [];
  }

  return {
    mode: 'highlight',
    paint(controller) {
      clear();
      if (!isCrossSelection(controller.editor.state.selection)) return;
      painted = coveredRanges(controller);
      const highlight = shared();
      for (const range of painted) highlight.add(range);
    },
    clear,
  };
}

// Without the highlight API the covered hosts draw the selection as decorations, which the hosts take from
// selectionDecorations once they render again.
function decorationPainter(): Painter {
  return { mode: 'decorations', paint: (controller) => controller.refreshHosts(), clear: () => undefined };
}

export function createPainter(win: Window): Painter {
  const { CSS: css, Highlight } = win as unknown as HighlightWindow;
  return css?.highlights && Highlight ? highlightPainter(css.highlights, Highlight) : decorationPainter();
}
