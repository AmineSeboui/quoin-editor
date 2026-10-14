import { useCallback, useSyncExternalStore } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { isCrossSelection } from '../selection/selection-decorations';
import { useViewController } from './editor-context';

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

function messageOf({ editor, announcer }: ViewController): string {
  const spoken = announcer.current();
  return spoken !== null && spoken.state === editor.state ? spoken.message : announcement(editor.state);
}

export function LiveRegion() {
  const controller = useViewController();
  const subscribe = useCallback(
    (notify: () => void) => {
      const stopState = controller.editor.subscribe(() => notify());
      const stopSpoken = controller.announcer.subscribe(notify);
      return () => {
        stopState();
        stopSpoken();
      };
    },
    [controller],
  );
  const read = useCallback(() => messageOf(controller), [controller]);
  const message = useSyncExternalStore(subscribe, read, read);
  return (
    <div className="quoin-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
