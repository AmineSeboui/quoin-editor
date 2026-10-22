import { createPluginKey, getPluginState, Transaction, type EditorState, type PluginSpec } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { closeStreaming } from './streaming-markdown';
import { mapTarget, type AiTarget } from './ai-target';

export type AiPhase = 'streaming' | 'done' | 'stopped' | 'error';

/** An answer being written or written: drawn in the document until it is accepted or discarded. */
export type AiGhost = {
  readonly key: number;
  /** Whether it replaces the target, rather than going below it. */
  readonly replace: boolean;
  readonly phase: AiPhase;
  /** The markdown as it streamed, applied on Accept. */
  readonly output: string;
  /** The same, closed so it can be drawn while it streams. */
  readonly shown: string;
  /** Whether the target's block was deleted, which ends the stream. */
  readonly lost: boolean;
};

export type AiState = {
  readonly target: AiTarget | null;
  /** The AI menu, and whether a Space on an empty line opened it. */
  readonly menu: { readonly fromSpace: boolean } | null;
  readonly ghost: AiGhost | null;
  /** The block the caret is in, once it has held text since the caret arrived. */
  readonly held: string | null;
};

export type AiAct =
  | { readonly type: 'open'; readonly target: AiTarget; readonly fromSpace: boolean }
  | { readonly type: 'close' }
  | { readonly type: 'start'; readonly key: number; readonly replace: boolean }
  | { readonly type: 'stream'; readonly key: number; readonly output: string }
  | { readonly type: 'end'; readonly key: number; readonly phase: AiPhase; readonly output: string }
  | { readonly type: 'discard' };

export const aiKey = createPluginKey<AiState>('ai');

export const AI = 'ai';

const IDLE: AiState = { target: null, menu: null, ghost: null, held: null };

export const aiState = (state: EditorState): AiState => getPluginState(state, aiKey);

/** A change of the AI state alone, kept out of the history. */
export const aiTransaction = (state: EditorState, act: AiAct): Transaction =>
  new Transaction(state).setMeta(AI, act).setMeta('addToHistory', false);

function written(ghost: AiGhost, key: number, phase: AiPhase, output: string): AiGhost {
  return ghost.key !== key ? ghost : { ...ghost, phase, output, shown: closeStreaming(output) };
}

function act(value: AiState, action: AiAct): AiState {
  switch (action.type) {
    case 'open':
      return { ...value, target: action.target, menu: { fromSpace: action.fromSpace }, ghost: null };
    case 'close':
      return value.ghost === null ? { ...value, target: null, menu: null } : { ...value, menu: null };
    case 'start': {
      const ghost: AiGhost = { key: action.key, replace: action.replace, phase: 'streaming', output: '', shown: '', lost: false };
      return value.target === null ? value : { ...value, menu: null, ghost };
    }
    case 'stream':
    case 'end': {
      const { ghost } = value;
      if (ghost === null || ghost.phase !== 'streaming') return value;
      const phase = action.type === 'end' ? action.phase : 'streaming';
      return { ...value, ghost: written(ghost, action.key, phase, action.output) };
    }
    case 'discard':
      return { ...value, target: null, menu: null, ghost: null };
  }
}

function caretBlock(state: EditorState): string | null {
  const { selection } = state;
  return selection?.kind === 'text' ? selection.head.block : null;
}

function heldText(tr: Transaction, value: AiState, before: EditorState, after: EditorState): string | null {
  const block = caretBlock(after);
  const held = block === caretBlock(before) ? value.held : null;
  if (!tr.docChanged || block === null || after.selection?.kind !== 'text') return held;
  const engineBlock = after.doc.blocks[after.doc.index.get(block)!];
  return regionLength(engineBlock, after.selection.head.region) > 0 ? block : held;
}

// The target follows every change, a collaborator's among them. Once its block is gone, the stream ends with what it
// wrote so far, which Accept puts where the target was.
function mapped(tr: Transaction, value: AiState): AiState {
  const { target, ghost } = value;
  if (!tr.docChanged || target === null) return value;
  const lost = !tr.doc.index.has(target.from.block) || !tr.doc.index.has(target.to.block);
  const moved = mapTarget(tr, target);
  if (moved === null || (lost && ghost === null)) return { ...value, target: null, menu: null, ghost: null };
  const next = { ...value, target: moved };
  if (!lost || ghost === null || ghost.lost) return next;
  return { ...next, ghost: { ...ghost, lost, phase: ghost.phase === 'streaming' ? 'stopped' : ghost.phase } };
}

export const aiPlugin: PluginSpec<AiState> = {
  key: aiKey,
  init: () => IDLE,
  apply(tr, value, before, after) {
    const held = heldText(tr, value, before, after);
    const next = mapped(tr, held === value.held ? value : { ...value, held });
    const action = tr.getMeta<AiAct>(AI);
    return action === undefined ? next : act(next, action);
  },
};
