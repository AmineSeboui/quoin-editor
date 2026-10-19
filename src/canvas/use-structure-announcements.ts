import { useEffect } from 'react';
import type { QuoinLabels } from '../i18n/labels';
import { formatShortcut } from '../shortcuts/format-shortcut';
import type { ViewController } from '../view';
import { structureAnnouncement } from './structure-announcement';

/** Says in the live region where a block moved, and how many blocks were deleted and how to undo it. */
export function useStructureAnnouncements(controller: ViewController, labels: QuoinLabels): void {
  useEffect(() => {
    const undoKeys = formatShortcut('Mod-z', { isMac: controller.isMac, keyNames: labels.keyNames });
    return controller.editor.subscribe((_state, tr) => {
      const message = tr === null ? null : structureAnnouncement(tr, labels, undoKeys);
      if (message !== null) controller.announce(message);
    });
  }, [controller, labels]);
}
