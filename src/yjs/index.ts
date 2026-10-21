import type * as Y from 'yjs';
import type { CollaborationAdapter, CollaborationHistory } from '../engine/collab/adapter';
import { bind, type Binding } from './binding';
import type { YBlocks } from './doc-shape';
import type { Seed } from './seed';

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
  /** The name of the shared array the blocks live in. */
  field?: string;
  awareness?: YjsAwareness;
  user: CollaborationUser;
  /** Whether an empty shared document takes the editor's blocks on connect. */
  seed?: Seed;
  /** Hears about a second editor connected while one already is; it stays unconnected. Logged when absent. */
  onError?: (error: Error) => void;
};

export type YjsCollaboration = CollaborationAdapter & {
  readonly doc: Y.Doc;
  readonly blocks: YBlocks;
  readonly awareness: YjsAwareness | undefined;
  readonly user: CollaborationUser;
  /** The origin of this client's own changes to the shared document, which undo takes back. */
  readonly origin: object;
  readonly history: CollaborationHistory;
};

/**
 * Syncs an editor through `doc.getArray(field)`, one block per `Y.Map`, with an undo that takes back only this
 * client's changes. Pass it to `collaborationExtension`; it connects one editor at a time.
 */
export function yjsCollaboration(options: YjsCollaborationOptions): YjsCollaboration {
  const { doc, field = 'quoin', awareness, user, seed = 'if-empty' } = options;
  const onError = options.onError ?? ((error: Error) => console.error(error));
  const blocks: YBlocks = doc.getArray(field);
  const origins = { local: { user }, untracked: {} };
  let binding: Binding | null = null;
  return {
    doc,
    blocks,
    awareness,
    user,
    origin: origins.local,
    connect(editor) {
      if (binding !== null) {
        onError(new Error('A Yjs collaboration connects one editor at a time; this editor stays unconnected.'));
        return () => undefined;
      }
      const current = bind(editor, blocks, origins, seed);
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
      canUndo: () => binding?.history.manager.canUndo() ?? false,
      canRedo: () => binding?.history.manager.canRedo() ?? false,
    },
  };
}
