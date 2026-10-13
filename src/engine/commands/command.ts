import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';

export type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
