import fc from 'fast-check';
import type { CoreCommands } from '../../engine/extension/core-extensions';
import type { Editor } from '../../engine/extension/editor';
import { addColumn, addRow, removeColumn, removeRow } from '../../engine/commands/table-commands';
import { tableShape } from '../../engine/commands/table-shape';
import { removeBlocksStep } from '../../engine/transform/block-steps';
import { selectionChoice, selectionFor, type SelectionChoice } from '../../engine/test-support/selection-arbitrary';

export type EditKind =
  | 'insert'
  | 'delete'
  | 'mark'
  | 'split'
  | 'join'
  | 'move'
  | 'attrs'
  | 'retype'
  | 'remove'
  | 'table';

export type Edit = { kind: EditKind; at: SelectionChoice; pick: number };

const KINDS: readonly EditKind[] = ['insert', 'delete', 'mark', 'split', 'join', 'move', 'attrs'];

/** Every kind, with type changes between blocks with and without regions and whole blocks taken out. */
export const ALL_KINDS: readonly EditKind[] = [...KINDS, 'retype', 'remove'];

/** Every kind, and, as often as all of them together, a row or a column put into or taken out of the first table. */
export const TABLE_KINDS: readonly EditKind[] = [...ALL_KINDS, ...ALL_KINDS.map((): EditKind => 'table')];
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

// Enter on a divider, a code block turned into a paragraph, or a line turned into a code block.
function retype(editor: Editor<CoreCommands>, pick: number): boolean {
  const { blocks } = editor.state.doc;
  const block = blocks[pick % blocks.length];
  editor.commands.setSelection({ kind: 'node', block: block.id });
  if (block.type === 'DIVIDER') return editor.commands.splitBlock();
  if (block.type === 'CODE') return editor.commands.setBlockType('MARKDOWN', { kind: 'paragraph' });
  return editor.commands.setBlockType('CODE');
}

function reshapeTable(editor: Editor<CoreCommands>, pick: number): boolean {
  const table = editor.state.doc.blocks.find((block) => block.type === 'TABLE');
  if (table === undefined) return false;
  const { rows, cols } = tableShape(table);
  const at = Math.floor(pick / 4);
  const commands = [
    addRow(table.id, at % (rows + 1)),
    addColumn(table.id, at % (cols + 1)),
    rows > 1 ? removeRow(table.id, at % rows) : null,
    cols > 1 ? removeColumn(table.id, at % cols) : null,
  ];
  const command = commands[pick % 4];
  return command !== null && command(editor.state, editor.dispatch);
}

function remove(editor: Editor<CoreCommands>, pick: number): boolean {
  const { blocks } = editor.state.doc;
  if (blocks.length < 2) return false;
  editor.dispatch(editor.createTransaction().step(removeBlocksStep(pick % blocks.length, 1)));
  return true;
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
  retype,
  remove,
  table: reshapeTable,
};

/** Runs one edit at a selection chosen in the editor's current document; `text` is what an insert types. */
export function runEdit(editor: Editor<CoreCommands>, { kind, at, pick }: Edit, text: string): void {
  const { doc } = editor.state;
  if (doc.blocks.length === 0) return;
  if (kind === 'table') return void reshapeTable(editor, pick);
  const choice: SelectionChoice = kind === 'join' && at.kind === 'caret' ? { ...at, at: [at.at[0], 0, 'start'] } : at;
  const selection = selectionFor(doc, choice);
  if (selection === null) return;
  editor.commands.setSelection(selection);
  RUN[kind](editor, pick, text);
}
