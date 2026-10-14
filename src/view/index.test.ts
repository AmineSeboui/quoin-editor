import { describe, expect, it } from 'vitest';
import * as view from './index';
import * as headless from '../headless';
import * as engine from '../engine';

describe('view entry', () => {
  it('exports the documented surface', () => {
    expect(Object.keys(view).sort()).toMatchInlineSnapshot(`
      [
        "BlockShell",
        "EditableRegion",
        "EditorView",
        "SelectionSink",
        "ViewController",
        "VoidBlockFallback",
        "caretFromPoint",
        "defaultRenderers",
        "domMapOf",
        "hostKey",
        "isCrossSelection",
        "renderInline",
        "useEditorState",
        "useQuoinEditor",
        "useViewController",
      ]
    `);
  });

  it('is re-exported by the headless entry together with the engine', () => {
    expect(headless.EditorView).toBe(view.EditorView);
    expect(typeof headless.createEditor).toBe('function');
  });

  it('hides no engine name behind a clash with the 0.4 exports', () => {
    const exported: Record<string, unknown> = headless;
    const hidden = Object.entries(engine).filter(([name, value]) => exported[name] !== value);
    expect(hidden.map(([name]) => name)).toEqual([]);
  });
});
