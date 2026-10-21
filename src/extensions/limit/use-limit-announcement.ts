import { useEffect } from 'react';
import type { ViewController } from '../../view';
import type { Limit } from './limit-plugin';

export const LIMIT_ANNOUNCEMENT_INTERVAL_MS = 3000;

/** Says once why an edit was refused, and not again for a while however many follow. */
export function useLimitAnnouncement(controller: ViewController, limit: Limit | null, message: string): void {
  useEffect(() => {
    if (limit === null) return undefined;
    let spokenAt = -Infinity;
    return limit.onRefused((state) => {
      const now = Date.now();
      if (state !== controller.editor.state || now - spokenAt < LIMIT_ANNOUNCEMENT_INTERVAL_MS) return;
      spokenAt = now;
      controller.announce(message);
    });
  }, [controller, limit, message]);
}
