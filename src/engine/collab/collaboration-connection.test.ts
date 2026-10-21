import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { defineExtension } from '../extension/define-extension';
import type { Extension } from '../extension/types';
import { text } from '../model/inline';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { fakeAdapter } from '../test-support/fake-collaboration-adapter';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { CollaborationAdapter } from './adapter';
import { collaborationExtension } from './collaboration-extension';

const editorWith = (...extensions: Extension[]) =>
  startEditor([md('a', 'hello')], { extensions: [...coreExtensions(), ...extensions] }).editor;

describe('the connection of a collaboration extension', () => {
  it('opens once for every live mount of an editor and closes with the last', () => {
    const { adapter, connected, disconnect } = fakeAdapter();
    const editor = editorWith(collaborationExtension(adapter));
    const first = editor.mount();
    const second = editor.mount();
    expect(connected).toEqual([editor]);
    first();
    first();
    expect(disconnect).not.toHaveBeenCalled();
    second();
    expect(disconnect).toHaveBeenCalledTimes(1);
    editor.mount();
    expect(connected).toEqual([editor, editor]);
  });

  it('closes on destroy, and opens no more afterwards', () => {
    const { adapter, connected, disconnect } = fakeAdapter();
    const editor = editorWith(collaborationExtension(adapter));
    editor.mount();
    editor.mount();
    editor.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    editor.mount();
    expect(connected).toEqual([editor]);
  });

  it('is counted for each editor, when one extension value serves two', () => {
    const { adapter, connected, local } = fakeAdapter();
    const shared = collaborationExtension(adapter);
    const one = editorWith(shared);
    const two = editorWith(shared);
    one.mount();
    two.mount()();
    expect(connected).toEqual([one, two]);
    two.commands.setSelection(caret('a', 1));
    expect(local).toEqual([]);
    expect(two.setBlocks([md('b', 'host')])).toBe(true);
    one.commands.setSelection(caret('a', 1));
    expect(local).toHaveLength(1);
  });

  it('hands the adapter the changes made while it connects', () => {
    const local: string[] = [];
    const adapter: CollaborationAdapter = {
      connect(editor) {
        editor.dispatch(editor.createTransaction().step(replaceInlineStep('a', 'text', 0, 0, [text('seed ')])));
        return () => undefined;
      },
      onLocalTransaction: (tr) => void local.push(tr.origin),
    };
    const editor = editorWith(collaborationExtension(adapter));
    editor.mount();
    expect(editor.getBlocks()).toEqual([md('a', 'seed hello')]);
    expect(local).toEqual(['command']);
  });

  it('is not counted when connecting throws, so the next mount connects again', () => {
    const connect = vi.fn<CollaborationAdapter['connect']>(() => {
      throw new Error('offline');
    });
    const editor = editorWith(collaborationExtension({ connect, onLocalTransaction: () => undefined }));
    expect(() => editor.mount()).toThrow('offline');
    expect(editor.setBlocks([md('b', 'host')])).toBe(true);
    expect(() => editor.mount()).toThrow('offline');
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('closes when an extension mounted after it throws', () => {
    const { adapter, disconnect } = fakeAdapter();
    const failing = defineExtension({
      name: 'failing',
      priority: 10,
      onMount: () => {
        throw new Error('broken');
      },
    });
    const editor = editorWith(collaborationExtension(adapter), failing);
    expect(() => editor.mount()).toThrow('broken');
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
