import type { Command, EditorState, EngineBlock } from '../../engine';
import { toggleTask } from '../../engine/commands/block-structure';
import { setAttrs } from '../../engine/commands/block-style';
import { blockById } from '../../engine/model/doc';
import type { ViewController } from '../controller/view-controller';

const isTask = ({ type, attrs }: EngineBlock): boolean => type === 'MARKDOWN' && attrs.kind === 'task';

// A task is checked or unchecked and a toggle opened or closed. Every other block has no state to flip.
export function flipCommand(block: EngineBlock): Command | null {
  if (isTask(block)) return toggleTask;
  return block.type === 'TOGGLE' ? setAttrs({ open: block.attrs.open !== true }) : null;
}

function stateName(block: EngineBlock): string {
  if (isTask(block)) return block.attrs.checked === true ? 'checked' : 'unchecked';
  return block.attrs.open === true ? 'expanded' : 'collapsed';
}

function blockHoldingCaret({ doc, selection }: EditorState): EngineBlock | null {
  if (selection?.kind !== 'text' || selection.anchor.block !== selection.head.block) return null;
  return blockById(doc, selection.head.block) ?? null;
}

// The keyboard's way to what the checkbox and the chevron do, for the one block that holds the caret. The caret stays
// where it is, and the live region says what the block became, since nothing the caret is in announces it.
export function flipSelectedBlock(controller: ViewController): boolean {
  const { editor } = controller;
  const block = controller.readOnly ? null : blockHoldingCaret(editor.state);
  const command = block && flipCommand(block);
  if (!block || !command || !controller.run(command)) return false;
  const after = blockById(editor.state.doc, block.id);
  if (after) controller.announcer.announce(stateName(after));
  return true;
}
