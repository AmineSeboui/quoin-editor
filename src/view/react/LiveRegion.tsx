import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { ViewController } from '../controller/view-controller';
import { selectionAnnouncement, SILENCE, type Heard } from '../selection/selection-announcement';
import { useViewController } from './editor-context';

type LiveRegionProps = { blocksSelected: (count: number) => string };

function heardNow({ editor, announcer }: ViewController, blocksSelected: (count: number) => string): Heard {
  const spoken = announcer.current();
  if (spoken !== null) return { key: `said:${spoken.serial}`, message: spoken.message };
  return selectionAnnouncement(editor.state, blocksSelected);
}

export function LiveRegion({ blocksSelected }: LiveRegionProps) {
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
  const read = useMemo(() => {
    let last = SILENCE;
    return () => {
      const next = heardNow(controller, blocksSelected);
      if (next.key !== last.key || next.message !== last.message) last = next;
      return last;
    };
  }, [controller, blocksSelected]);
  const { key, message } = useSyncExternalStore(subscribe, read, read);
  // Each announcement is a new node, which a screen reader reads out even when its words are the ones it just said.
  return (
    <div className="quoin-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message !== '' && <span key={key}>{message}</span>}
    </div>
  );
}
