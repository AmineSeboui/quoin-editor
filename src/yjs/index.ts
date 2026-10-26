import type * as Y from 'yjs';
import type { CollaborationAdapter, CollaborationHistory } from '../engine/collab/adapter';
import { bind, type Binding } from './binding';
import type { Seed } from './seed';
import { holdBinding } from './bound';
import { undoHistory, type UndoHistory } from './undo-history';

export type CollaborationUser = { readonly name: string; readonly color?: string };

/** The part of a Yjs awareness (from `y-protocols`) that presence reads and writes, given by the host's provider. */
export type YjsAwareness = {
  readonly clientID: number;
  getLocalState(): Record<string, unknown> | null;
  setLocalStateField(field: string, value: unknown): void;
  getStates(): Map<number, Record<string, unknown>>;
  on(event: 'change', listener: (...args: never[]) => void): void;
  off(event: 'change', listener: (...args: never[]) => void): void;
};

export type YjsCollaborationOptions = {
  doc: Y.Doc;
  /** The name of the shared text the document lives in. */
  field?: string;
  awareness?: YjsAwareness;
  user: CollaborationUser;
  /** Whether an empty shared document takes the editor's blocks on connect. */
  seed?: Seed;
  /**
   * Hears about a second editor connected while one already is, which stays unconnected, and about a change to the
   * shared document that did not apply to the editor, which then takes the document as it reads. Logged when absent.
   */
  onError?: (error: Error) => void;
};

export type YjsCollaboration = CollaborationAdapter & {
  readonly doc: Y.Doc;
  /** The shared text that holds the document, one marker map starting each block. */
  readonly text: Y.Text;
  readonly awareness: YjsAwareness | undefined;
  readonly user: CollaborationUser;
  /** The origin of this client's own changes to the shared document, which undo takes back. */
  readonly origin: object;
  readonly history: CollaborationHistory;
};

/**
 * Syncs an editor through `doc.getText(field)`, which holds the whole document, with an undo that takes back only this
 * client's changes. Pass it to `collaborationExtension`; it connects one editor at a time.
 */
export function yjsCollaboration(options: YjsCollaborationOptions): YjsCollaboration {
  const { doc, field = 'quoin', awareness, user, seed = 'if-empty' } = options;
  const onError = options.onError ?? ((error: Error) => console.error(error));
  const text = doc.getText(field);
  const origins = { local: { user }, untracked: {} };
  let history: UndoHistory | undefined;
  let binding: Binding | null = null;
  const collaboration: YjsCollaboration = {
    doc,
    text,
    awareness,
    user,
    origin: origins.local,
    connect(editor) {
      if (binding !== null) {
        onError(new Error('A Yjs collaboration connects one editor at a time; this editor stays unconnected.'));
        return () => undefined;
      }
      const current = bind(editor, text, {
        origins,
        seed,
        onError,
        history: () => (history ??= undoHistory(text, origins.local)),
      });
      binding = current;
      return () => {
        current.stop();
        if (binding === current) binding = null;
      };
    },
    onLocalTransaction: (tr, state) => {
      if (binding?.editor.state === state) binding.local(tr);
    },
    history: {
      undo: () => binding?.travel('undo') ?? false,
      redo: () => binding?.travel('redo') ?? false,
      canUndo: () => binding !== null && history!.manager.canUndo(),
      canRedo: () => binding !== null && history!.manager.canRedo(),
    },
  };
  holdBinding(collaboration, () => binding);
  return collaboration;
}
