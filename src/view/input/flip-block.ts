import type { Command, EditorState, EngineBlock } from '../../engine';
import { toggleTask } from '../../engine/commands/block-structure';
import { setAttrs } from '../../engine/commands/block-style';
import { blockById } from '../../engine/model/doc';
import { readerToggles, shownOpen } from '../controller/reader-toggles';
import type { ViewController } from '../controller/view-controller';

const isTask = ({ type, attrs }: EngineBlock): boolean => type === 'MARKDOWN' && attrs.kind === 'task';

// A task is checked or unchecked and a toggle opened or closed. Every other block has no state to flip.
export function flipCommand(block: EngineBlock): Command | null {
  if (isTask(block)) return toggleTask;
  return block.type === 'TOGGLE' ? setAttrs({ open: block.attrs.open !== true }) : null;
}

const toggleState = (open: boolean): string => (open ? 'expanded' : 'collapsed');

function stateName(block: EngineBlock): string {
  if (isTask(block)) return block.attrs.checked === true ? 'checked' : 'unchecked';
  return toggleState(block.attrs.open === true);
}

function blockHoldingCaret({ doc, selection }: EditorState): EngineBlock | null {
  if (selection?.kind !== 'text' || selection.anchor.block !== selection.head.block) return null;
  return blockById(doc, selection.head.block) ?? null;
}

// A reader opens or closes a toggle for themselves, leaving the document as it is.
function flipForReader(controller: ViewController, block: EngineBlock | null): boolean {
  if (block?.type !== 'TOGGLE') return false;
  const toggles = readerToggles(controller);
  toggles.flip(block);
  controller.announce(toggleState(shownOpen(block, toggles.choices)));
  return true;
}

// The keyboard's way to what the checkbox and the chevron do, for the one block that holds the caret. The caret stays
// where it is, and the live region says what the block became, since nothing the caret is in announces it.
export function flipSelectedBlock(controller: ViewController): boolean {
  const { editor } = controller;
  const block = blockHoldingCaret(editor.state);
  if (controller.readOnly) return flipForReader(controller, block);
  const command = block && flipCommand(block);
  if (!block || !command || !controller.run(command)) return false;
  const after = blockById(editor.state.doc, block.id);
  if (after) controller.announce(stateName(after));
  return true;
}
