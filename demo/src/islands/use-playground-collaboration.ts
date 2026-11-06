import { useEffect, useState } from 'react';
import type { Extension } from 'quoin-editor/engine';
import type { PresenceLabels } from 'quoin-editor/presence';
import { collaborating, PARTNER, WRITER } from './playground-collaboration';

export type Pair = { writer: Extension[]; partner: Extension[] };

/**
 * Both sides of the shared document, made together so they meet on the same channel in the same tick and are torn
 * down together. Owning them in an effect rather than in state is what lets the channel close again: a `useState`
 * initializer keeps its value across the unmount React runs in development, so a cleanup would leave it holding a
 * closed channel and a destroyed document.
 */
export function usePlaygroundCollaboration(
  on: boolean,
  channel: string,
  labels: Partial<PresenceLabels> | undefined,
): Pair | null {
  const [pair, setPair] = useState<Pair | null>(null);

  useEffect(() => {
    if (!on) {
      setPair(null);
      return;
    }
    const writer = collaborating(channel, WRITER, labels);
    const partner = collaborating(channel, PARTNER, labels);
    setPair({ writer: writer.extensions, partner: partner.extensions });
    return () => {
      writer.leave();
      partner.leave();
      setPair(null);
    };
  }, [on, channel, labels]);

  return pair;
}
