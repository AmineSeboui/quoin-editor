import type { CommandFactories } from '../commands/chain';
import type { Editor } from '../extension/editor';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';

export type CollaborationHistory = { undo(): boolean; redo(): boolean; canUndo(): boolean; canRedo(): boolean };

/**
 * What ties an editor to a shared document. `connect` runs when the editor is mounted and returns how to disconnect,
 * which runs when that mount ends or the editor is destroyed; the shared document, its first content included, comes in
 * through `applyRemote`.
 * Every transaction the editor's own user makes, selection changes included, reaches `onLocalTransaction`. With
 * `history`, undo and redo go through it rather than the editor's own history.
 */
export type CollaborationAdapter = {
  connect(editor: Editor<CommandFactories>): () => void;
  onLocalTransaction(tr: Transaction, state: EditorState): void;
  history?: CollaborationHistory;
};
