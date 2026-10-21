import { describe, expect, it, vi } from 'vitest';
import type { Decoration, Extension } from '../../engine';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import { decorationsByHost, hostDecorations, NO_DECORATIONS, sameDecorations } from './host-decorations';
import { hostKey } from './host-registry';

const inline = (from: number, to: number, attrs = { class: 'x' }): Decoration =>
  ({ kind: 'inline', block: 'a', region: 'text', from, to, attrs });
const widget = (side: -1 | 1, attrs = {}): Decoration =>
  ({ kind: 'widget', block: 'a', region: 'text', offset: 1, key: 'k', widget: 'w', attrs, side });

describe('host decorations', () => {
  it('groups inline and widget decorations by host, and block decorations under their block with no region', () => {
    const other: Decoration = { kind: 'inline', block: 'a', region: 'caption', from: 0, to: 1, attrs: {} };
    const block: Decoration = { kind: 'block', block: 'a', attrs: {} };
    const groups = decorationsByHost([inline(0, 1), block, widget(1), other]);
    expect(groups.get(hostKey('a', 'text'))).toEqual([inline(0, 1), widget(1)]);
    expect(groups.get(hostKey('a', 'caption'))).toEqual([other]);
    expect(groups.get(hostKey('a', ''))).toEqual([block]);
    expect(groups.size).toBe(3);
  });

  it('compares decorations by content rather than identity', () => {
    expect(sameDecorations([inline(0, 1), widget(1)], [inline(0, 1), widget(1)])).toBe(true);
    expect(sameDecorations([inline(0, 1)], [inline(0, 2)])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [inline(0, 1, { class: 'y' })])).toBe(false);
    expect(sameDecorations([widget(1)], [widget(-1)])).toBe(false);
    expect(sameDecorations([widget(1)], [widget(1, { title: 't' })])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [inline(0, 1), widget(1)])).toBe(false);
    expect(sameDecorations([inline(0, 1)], [widget(1)])).toBe(false);
  });
});

describe('hostDecorations', () => {
  const mark: Extension = {
    name: 'mark',
    decorations: (): readonly Decoration[] => [
      { kind: 'inline', block: 'a', region: 'text', from: 0, to: 1, attrs: { class: 'x' } },
      { kind: 'block', block: 'b', attrs: {} },
    ],
  };

  function setup() {
    const editor = createEditor({
      blocks: [
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
        { id: 'b', type: 'MARKDOWN', data: { markdown: 'two' } },
      ],
      extensions: [...coreExtensions(), mark],
    });
    return { editor, calls: vi.spyOn(editor, 'decorations') };
  }

  it('gives each host its own decorations and none to the rest', () => {
    const { editor } = setup();
    expect(hostDecorations(editor, 'a', 'text')).toEqual([
      { kind: 'inline', block: 'a', region: 'text', from: 0, to: 1, attrs: { class: 'x' } },
    ]);
    expect(hostDecorations(editor, 'b', 'text')).toBe(NO_DECORATIONS);
    expect(hostDecorations(editor, 'b', '')).toEqual([{ kind: 'block', block: 'b', attrs: {} }]);
    expect(hostDecorations(editor, 'missing', 'text')).toBe(NO_DECORATIONS);
  });

  it('asks the editor for its decorations once per state however many hosts ask', () => {
    const { editor, calls } = setup();
    for (const id of ['a', 'b', 'a', 'b']) hostDecorations(editor, id, 'text');
    hostDecorations(editor, 'b', '');
    expect(calls).toHaveBeenCalledTimes(1);
    editor.insertText('x');
    hostDecorations(editor, 'a', 'text');
    expect(calls).toHaveBeenCalledTimes(2);
  });
});
