import { replaceInlineStep, text, textSelection, Transaction, type Command, type Pos } from '../../engine';
import { caretMarks } from '../../engine/commands/caret-marks';
import { setLink } from '../../engine/commands/marks';
import { addMark } from '../../engine/model/marks';
import { isCollapsed } from '../../engine/state/selection';
import { linkAtSelection } from './link-at-selection';

function insertLinkedText(value: string, href: string, caret: Pos): Command {
  return (state, dispatch) => {
    const marks = addMark(caretMarks(state.doc, state.schema, state.storedMarks, caret), { type: 'link', attrs: { href } });
    const tr = new Transaction(state)
      .step(replaceInlineStep(caret.block, caret.region, caret.offset, caret.offset, [text(value, marks)]))
      .setSelection(textSelection({ ...caret, offset: caret.offset + value.length }));
    dispatch?.(tr);
    return true;
  };
}

/**
 * Links the selected text, or the whole link around a collapsed caret, to `href`, keeping that link's title. At a
 * caret outside every link it inserts `value` linked to `href` and leaves the caret after it.
 */
export function applyLink(href: string, value: string): Command {
  return (state, dispatch) => {
    const { selection } = state;
    const link = linkAtSelection(state);
    if (selection?.kind === 'text' && isCollapsed(selection) && link === null) {
      return insertLinkedText(value, href, selection.head)(state, dispatch);
    }
    return setLink(href, link?.title)(state, dispatch);
  };
}
