import type { EditorState } from '../../engine';
import { isCrossSelection } from '../selection/selection-decorations';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';

function announcement({ doc, selection }: EditorState): string {
  if (selection === null || (selection.kind === 'text' && !isCrossSelection(selection))) return '';
  if (selection.kind === 'node') return '1 block selected';
  const { anchor, head } = selection;
  const first = doc.index.get(typeof anchor === 'string' ? anchor : anchor.block);
  const last = doc.index.get(typeof head === 'string' ? head : head.block);
  if (first === undefined || last === undefined) return '';
  const count = Math.abs(first - last) + 1;
  return `${count} ${count === 1 ? 'block' : 'blocks'} selected`;
}

export function LiveRegion() {
  const message = useEditorState(useViewController(), announcement);
  return (
    <div className="quoin-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
