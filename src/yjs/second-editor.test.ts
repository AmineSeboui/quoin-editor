import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { collaborationExtension } from '../engine/collab/collaboration-extension';
import { coreExtensions, type CoreCommands } from '../engine/extension/core-extensions';
import { createEditor } from '../engine/extension/editor';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { yjsCollaboration } from './index';

function editorOn(extension: ReturnType<typeof collaborationExtension>) {
  return createEditor<CoreCommands>({ blocks: [md('a', 'hello')], isMac: true, extensions: [...coreExtensions(), extension] });
}

describe('a Yjs collaboration asked to connect a second editor', () => {
  it('reports it to onError instead of throwing, and keeps the first editor connected alone', () => {
    const doc = new Y.Doc();
    const onError = vi.fn();
    const extension = collaborationExtension(yjsCollaboration({ doc, user: { name: 'a' }, onError }));
    const first = editorOn(extension);
    const second = editorOn(extension);
    first.mount();
    expect(() => second.mount()).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(String(onError.mock.calls[0][0].message)).toMatch(/one editor at a time/);
    second.commands.setSelection(caret('a', 5));
    second.insertText('?');
    first.commands.setSelection(caret('a', 5));
    first.insertText('!');
    expect(doc.getText('quoin').toString()).toBe('hello!');
  });

  it('logs the error when no onError is given', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const extension = collaborationExtension(yjsCollaboration({ doc: new Y.Doc(), user: { name: 'a' } }));
    editorOn(extension).mount();
    editorOn(extension).mount();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
