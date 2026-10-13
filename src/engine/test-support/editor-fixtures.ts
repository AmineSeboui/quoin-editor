import { vi } from 'vitest';
import { createEditor, type EditorOptions } from '../extension/editor';
import type { KeyLike } from '../extension/keymap';
import type { QuoinBlock } from '../model/quoin-block';

export const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

export const key = (name: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key: name,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

export const mod = (name: string, extra: Partial<KeyLike> = {}): KeyLike => key(name, { metaKey: true, ...extra });

export function startEditor(blocks: QuoinBlock[], options: Partial<EditorOptions> = {}) {
  let n = 0;
  const onChange = vi.fn();
  const editor = createEditor({ blocks, onChange, newId: () => `n${++n}`, now: () => 0, isMac: true, ...options });
  return { editor, onChange };
}

export const caret = (block: string, offset: number) => ({
  kind: 'text' as const,
  anchor: { block, region: 'text', offset },
  head: { block, region: 'text', offset },
});

export const range = (block: string, from: number, to: number) => ({
  kind: 'text' as const,
  anchor: { block, region: 'text', offset: from },
  head: { block, region: 'text', offset: to },
});
