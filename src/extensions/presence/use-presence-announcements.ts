import { useEffect } from 'react';
import type { ViewController } from '../../view';
import type { PeopleChange, PresenceLink } from './presence-link';
import { createPresenceAnnouncer } from './presence-announcements';
import type { PresenceLabels } from './presence-labels';

/** Says through the canvas's live region who joined and who left. */
export function usePresenceAnnouncements(controller: ViewController, link: PresenceLink, labels: PresenceLabels): void {
  useEffect(() => {
    const announcer = createPresenceAnnouncer((message) => controller.announce(message), labels);
    const listener = (change: PeopleChange) => announcer.hear(change);
    link.listeners.add(listener);
    return () => {
      link.listeners.delete(listener);
      announcer.stop();
    };
  }, [controller, link, labels]);
}
