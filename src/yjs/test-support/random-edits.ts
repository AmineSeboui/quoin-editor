import fc from 'fast-check';
import type { CoreCommands } from '../../engine/extension/core-extensions';
import type { Editor } from '../../engine/extension/editor';
import { selectionChoice, selectionFor, type SelectionChoice } from '../../engine/test-support/selection-arbitrary';

export type EditKind = 'insert' | 'delete' | 'mark' | 'split' | 'join' | 'move' | 'attrs';

export type Edit = { kind: EditKind; at: SelectionChoice; pick: number };

const KINDS: readonly EditKind[] = ['insert', 'delete', 'mark', 'split', 'join', 'move', 'attrs'];
const MARKS = ['bold', 'italic', 'code'] as const;
const COMMENTS = ['c1', 'c2'];
const PATCHES = [{ kind: 'heading', level: 2 }, { kind: 'quote' }, { kind: 'paragraph' }, { kind: 'bullet' }];

export const arbitraryEdit = (kinds: readonly EditKind[] = KINDS): fc.Arbitrary<Edit> =>
  fc.record({ kind: fc.constantFrom(...kinds), at: selectionChoice, pick: fc.nat(99) });

function mark(editor: Editor<CoreCommands>, pick: number): boolean {
  if (pick % 4 === 3) return editor.commands.setMark('comment', { id: COMMENTS[pick % 2] });
  return editor.commands.toggleMark(MARKS[pick % MARKS.length]);
}

function move(editor: Editor<CoreCommands>, pick: number): boolean {
  return pick % 2 === 0 ? editor.commands.moveBlocksDown() : editor.commands.moveBlocksUp();
}

const RUN: Record<EditKind, (editor: Editor<CoreCommands>, pick: number, text: string) => boolean> = {
  insert: (editor, _pick, text) => editor.insertText(text),
  delete: (editor, pick) => (pick % 2 === 0 ? editor.commands.deleteBackward() : editor.commands.deleteSelection()),
  mark,
  split: (editor) => editor.commands.splitBlock(),
  join: (editor) => editor.commands.deleteBackward(),
  move,
  attrs: (editor, pick) =>
    pick % 5 === 4 ? editor.commands.indent() : editor.commands.setAttrs(PATCHES[pick % PATCHES.length]),
};

/** Runs one edit at a selection chosen in the editor's current document; `text` is what an insert types. */
export function runEdit(editor: Editor<CoreCommands>, { kind, at, pick }: Edit, text: string): void {
  const { doc } = editor.state;
  if (doc.blocks.length === 0) return;
  const choice: SelectionChoice = kind === 'join' && at.kind === 'caret' ? { ...at, at: [at.at[0], 0, 'start'] } : at;
  const selection = selectionFor(doc, choice);
  if (selection === null) return;
  editor.commands.setSelection(selection);
  RUN[kind](editor, pick, text);
}
