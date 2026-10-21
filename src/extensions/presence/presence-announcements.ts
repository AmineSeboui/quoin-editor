import type { Person } from '../../yjs/presence-link';
import type { PresenceLabels } from './presence-labels';

/** How long after saying that a person came or went the next change of theirs waits. */
export const PRESENCE_ANNOUNCEMENT_MS = 3000;
const GROUP_MS = 500;

type Kind = 'joined' | 'left';
type Known = { name: string; said: Kind; at: number; later?: ReturnType<typeof setTimeout> };

export type PresenceAnnouncer = {
  hear(change: { readonly joined: readonly Person[]; readonly left: readonly Person[] }): void;
  stop(): void;
};

/**
 * Gathers who joined and who left for a moment, then says it in one announcement. A person's next change waits until
 * a few seconds after the last one said, and is dropped when it brings them back to what was said.
 */
export function createPresenceAnnouncer(
  announce: (message: string) => void,
  labels: PresenceLabels,
): PresenceAnnouncer {
  const people = new Map<number, Known>();
  let waiting: Record<Kind, string[]> = { joined: [], left: [] };
  let group: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    group = undefined;
    const { joined, left } = waiting;
    waiting = { joined: [], left: [] };
    announce(
      [joined.length > 0 && labels.joined(joined), left.length > 0 && labels.left(left)].filter(Boolean).join('. '),
    );
  };
  const say = (known: Known, kind: Kind) => {
    known.said = kind;
    known.at = Date.now();
    waiting[kind].push(known.name);
    group ??= setTimeout(flush, GROUP_MS);
  };
  const note = ({ client, name }: Person, kind: Kind) => {
    const known = people.get(client);
    const wait = known === undefined ? 0 : known.at + PRESENCE_ANNOUNCEMENT_MS - Date.now();
    if (known === undefined || wait <= 0) {
      clearTimeout(known?.later);
      const fresh = known ?? { name, said: kind, at: 0 };
      people.set(client, fresh);
      return say(fresh, kind);
    }
    clearTimeout(known.later);
    known.later = kind === known.said ? undefined : setTimeout(() => say(known, kind), wait);
  };
  return {
    hear({ joined, left }) {
      for (const person of joined) note(person, 'joined');
      for (const person of left) note(person, 'left');
    },
    stop() {
      clearTimeout(group);
      for (const { later } of people.values()) clearTimeout(later);
    },
  };
}
