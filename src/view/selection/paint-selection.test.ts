import { describe, expect, it } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { createPainter } from './paint-selection';

describe('createPainter', () => {
  it('uses the highlight registry when the browser has one', () => {
    const registry = new Map<string, unknown>();
    const win = { CSS: { highlights: registry }, Highlight: class { constructor(...ranges: Range[]) { (this as unknown as { ranges: Range[] }).ranges = ranges; } } } as unknown as Window;
    expect(createPainter(win).mode).toBe('highlight');
  });

  it('falls back to decorations without it', () => {
    expect(createPainter({ CSS: {} } as unknown as Window).mode).toBe('decorations');
  });
});

describe('the highlight painter', () => {
  const at = (block: string, offset: number) => ({ block, region: 'text', offset });

  function drawn(texts: Record<string, string>) {
    const blocks = Object.entries(texts).map(([id, markdown]) => ({ id, type: 'MARKDOWN', data: { markdown } }));
    const controller = new ViewController({ editor: createEditor({ blocks }) });
    for (const id of Object.keys(texts)) {
      controller.registry.register(id, 'text', document.createElement('div'));
      controller.renderHost(id, 'text');
    }
    const select = (anchor: ReturnType<typeof at>, head: ReturnType<typeof at>) =>
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
    return { controller, select };
  }

  const registry = new Map<string, Set<Range>>();
  const win = { CSS: { highlights: registry }, Highlight: Set } as unknown as Window;
  const painted = () => [...(registry.get('quoin-selection') ?? [])].map((range) => range.toString());

  it('highlights one range per covered host and nothing for a selection inside one host', () => {
    const { controller, select } = drawn({ a: 'hello', b: 'mid', c: 'world' });
    const painter = createPainter(win);
    select(at('a', 2), at('c', 3));
    painter.paint(controller);
    expect(painted()).toEqual(['llo', 'mid', 'wor']);
    select(at('a', 1), at('a', 3));
    painter.paint(controller);
    expect(painted()).toEqual([]);
  });

  it('takes back only its own ranges from the highlight the page shares', () => {
    const first = drawn({ a: 'one', b: 'two' });
    const second = drawn({ c: 'three', d: 'four' });
    const [mine, theirs] = [createPainter(win), createPainter(win)];
    first.select(at('a', 1), at('b', 1));
    second.select(at('c', 0), at('d', 2));
    mine.paint(first.controller);
    theirs.paint(second.controller);
    mine.clear();
    expect(painted()).toEqual(['three', 'fo']);
  });
});
