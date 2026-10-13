import type { EditorState } from '../../engine';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';

function announcement({ doc, selection }: EditorState): string {
  if (selection === null || selection.kind === 'text') return '';
  if (selection.kind === 'node') return '1 block selected';
  const anchor = doc.index.get(selection.anchor);
  const head = doc.index.get(selection.head);
  if (anchor === undefined || head === undefined) return '';
  const count = Math.abs(anchor - head) + 1;
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
