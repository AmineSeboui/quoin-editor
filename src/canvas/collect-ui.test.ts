import { Star } from 'lucide-react';
import { coreBlocks } from '../blocks/core';
import { inPlaceRenderers } from '../blocks/in-place-renderers';
import { textRenderers } from '../blocks/text/text-renderers';
import { defineExtension } from '../engine';
import type { ExtensionUI, SlashItem } from '../extensions/ui-types';
import { defineBlock } from '../registry';
import { collectUi } from './collect-ui';

const slashItem = (id: string): SlashItem => ({ id, title: id, group: 'basic', run: () => {} });
const withUi = (name: string, ui: unknown) => defineExtension({ name, ui });
const Drawn = () => null;

const chart = defineBlock({ type: 'CHART', label: 'Chart', icon: Star, preview: () => null });
const hidden = defineBlock({ type: 'HIDDEN', label: 'Hidden', icon: Star, preview: () => null, inSlashPalette: false });

describe('collectUi', () => {
  it('lists the slash commands of the extensions in order, then one per registered type no built-in inserts', () => {
    const extensions = [withUi('a', { slashItems: [slashItem('one')] }), withUi('b', { slashItems: [slashItem('two')] })];
    const ui = collectUi(extensions, [...coreBlocks, chart, hidden]);
    expect(ui.slashItems.map((item) => [item.id, item.group])).toEqual([
      ['one', 'basic'],
      ['two', 'basic'],
      ['block:CHART', 'custom'],
    ]);
  });

  it('draws the canvas blocks itself unless an extension brings its own renderer for the type', () => {
    expect(collectUi([], coreBlocks).renderers.MARKDOWN).toBe(textRenderers.MARKDOWN);
    const ui = collectUi([withUi('a', { renderers: { MARKDOWN: Drawn } })], coreBlocks);
    expect(ui.renderers.MARKDOWN).toBe(Drawn);
    expect(ui.renderers.CALLOUT).toBe(textRenderers.CALLOUT);
  });

  it('draws a host definition of a type it draws itself as a void block, one typed in place only read-only', () => {
    const markdown = defineBlock({ type: 'MARKDOWN', label: 'Markdown', icon: Star, preview: () => null });
    const divider = defineBlock({ type: 'DIVIDER', label: 'Divider', icon: Star, preview: () => null });
    const definitions = [...coreBlocks, markdown, divider];
    const editable = collectUi([], definitions).renderers;
    const readOnly = collectUi([], definitions, true).renderers;
    expect(editable.MARKDOWN).toBe(textRenderers.MARKDOWN);
    expect(readOnly.MARKDOWN).not.toBe(textRenderers.MARKDOWN);
    expect(readOnly.MARKDOWN).toBe(collectUi([], [markdown], true).renderers.MARKDOWN);
    expect(editable.DIVIDER).not.toBe(textRenderers.DIVIDER);
    expect(editable.DIVIDER).toBe(readOnly.DIVIDER);
    expect([readOnly.CALLOUT, readOnly.TOGGLE]).toEqual([textRenderers.CALLOUT, textRenderers.TOGGLE]);
    expect(collectUi([], [...coreBlocks], true).renderers.MARKDOWN).toBe(textRenderers.MARKDOWN);
  });

  it('draws its own text blocks for relabelled copies of the core definitions, which keep their preview', () => {
    const relabelled = coreBlocks.map((definition) => ({ ...definition, label: `Copy of ${definition.label}` }));
    const { renderers } = collectUi([], relabelled, true);
    expect([renderers.MARKDOWN, renderers.CALLOUT]).toEqual([textRenderers.MARKDOWN, textRenderers.CALLOUT]);
  });

  it("draws Quoin's code block in place while a definition of it is registered, on any canvas", () => {
    const relabelled = coreBlocks.map((definition) => ({ ...definition, label: `Copy of ${definition.label}` }));
    expect(collectUi([], coreBlocks).renderers.CODE).toBe(inPlaceRenderers.CODE);
    expect(collectUi([], coreBlocks, true).renderers.CODE).toBe(inPlaceRenderers.CODE);
    expect(collectUi([], relabelled).renderers.CODE).toBe(inPlaceRenderers.CODE);
  });

  it('draws a host definition of CODE as a void block, and no code block where none is registered', () => {
    const snippet = defineBlock({ type: 'CODE', label: 'Snippet', icon: Star, preview: () => null });
    const { renderers } = collectUi([], [...coreBlocks, snippet]);
    expect(renderers.CODE).toBe(collectUi([], [snippet]).renderers.CODE);
    expect(renderers.CODE).not.toBe(inPlaceRenderers.CODE);
    expect(collectUi([], [chart]).renderers.CODE).toBeUndefined();
  });

  it('merges the render options, a later extension winning an atom both draw', () => {
    const first = () => document.createElement('span');
    const second = () => document.createElement('b');
    const mention = () => document.createElement('i');
    const ui = collectUi(
      [
        withUi('a', { render: { atoms: { emoji: first, mention } } }),
        withUi('b', { render: { atoms: { emoji: second } } }),
      ],
      [],
    );
    expect(ui.render?.atoms).toEqual({ emoji: second, mention });
    expect(collectUi([withUi('a', {})], []).render).toBeUndefined();
  });

  it('gathers block menu items, bubble items and overlays, and ignores a ui field that is not an object', () => {
    const action = { id: 'star', label: 'Star', icon: Star, run: () => {} };
    const button = { id: 'star', title: 'Star', icon: Star, run: () => {} };
    const ui: ExtensionUI = { blockMenuItems: [action], bubbleItems: [button], overlays: [Drawn] };
    const collected = collectUi([withUi('a', ui), withUi('b', 'nonsense'), withUi('c', null)], []);
    expect(collected.blockMenuItems).toEqual([action]);
    expect(collected.bubbleItems).toEqual([button]);
    expect(collected.overlays).toEqual([Drawn]);
    expect(collected.slashItems).toEqual([]);
  });
});
