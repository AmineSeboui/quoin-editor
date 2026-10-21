import { str } from '../../blocks/str';
import { atom, setAttrsStep, Transaction, type AtomNode, type EditorState } from '../../engine';
import { caretMarks } from '../../engine/commands/caret-marks';
import { blockById } from '../../engine/model/doc';
import { inlineText } from '../../engine/model/inline';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import type { ViewController } from '../../view';
import { atomAt } from '../atoms/atom-place';
import { MATH_ATOMS } from './math-feature';
import type { AtomTarget, BlockTarget, InsertTarget } from './math-target';

// Only while the canvas is editable and drawn: a canvas being taken down has let go of its root first. A write that
// hands focus back goes through the view, which draws it at once, so the caret is put back into the line as drawn after
// it; any other goes to the editor itself, which the view follows without taking focus.
function write(controller: ViewController, tr: Transaction, refocus: boolean): void {
  if (controller.readOnly || controller.root === null) return;
  if (refocus) controller.dispatch(tr);
  else controller.editor.dispatch(tr);
}

/** The formula `target` names, while it still holds the LaTeX its editor opened with. */
export function targetAtom(state: EditorState, target: AtomTarget): AtomNode | null {
  const node = atomAt(state, target, MATH_ATOMS);
  return node !== null && (node.attrs.latex ?? '') === target.latex ? node : null;
}

/** Whether the block `target` names is still a math block holding the LaTeX its editor opened with. */
export function targetBlockThere(state: EditorState, target: BlockTarget): boolean {
  const block = blockById(state.doc, target.block);
  return block?.type === 'MATH' && str(block.attrs.latex) === target.latex;
}

/** Whether the line `target` writes a formula into still holds the text it held when the editor opened. */
export function targetLineThere(state: EditorState, target: InsertTarget): boolean {
  const inline = blockById(state.doc, target.block)?.regions[target.region];
  return inline !== undefined && inlineText(inline) === target.text;
}

export function storeBlockLatex(
  controller: ViewController,
  target: BlockTarget,
  latex: string,
  refocus: boolean,
): void {
  const { state } = controller.editor;
  if (!targetBlockThere(state, target)) return;
  write(controller, new Transaction(state).step(setAttrsStep(target.block, { latex })), refocus);
}

/** Writes the LaTeX into the formula, or removes the formula when the LaTeX is empty, in one step. */
export function storeAtomLatex(controller: ViewController, target: AtomTarget, latex: string, refocus: boolean): void {
  const { state } = controller.editor;
  const node = targetAtom(state, target);
  if (node === null) return;
  const { block, region, offset } = target;
  const formula = latex === '' ? [] : [atom('math', { ...node.attrs, latex }, node.marks)];
  const tr = new Transaction(state).step(replaceInlineStep(block, region, offset, offset + 1, formula));
  write(controller, tr, refocus);
}

/** Writes a new formula at the caret, with the marks typed text would take there, in one step. */
export function insertFormula(controller: ViewController, target: InsertTarget, latex: string, refocus: boolean): void {
  const { state } = controller.editor;
  if (latex === '' || !targetLineThere(state, target)) return;
  const { block, region, offset } = target;
  const formula = atom('math', { latex }, caretMarks(state.doc, state.schema, state.storedMarks, target));
  write(controller, new Transaction(state).step(replaceInlineStep(block, region, offset, offset, [formula])), refocus);
}
