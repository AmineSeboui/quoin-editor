import type { CommandFactories, Editor } from '../../engine';
import type { AiRequest } from './ai-actions';

/** The part of an editor AI actions use, whatever commands it has. */
export type AiEditor = Pick<Editor<CommandFactories>, 'state' | 'dispatch' | 'subscribe'>;

/** A stream being read: its abort controller, what it has written so far and the frame that will draw it. */
export type AiRun = {
  readonly key: number;
  readonly abort: AbortController;
  output: string;
  cancelFrame: (() => void) | null;
};

/**
 * What AI actions know of one editor across its mounts: how many views have it mounted, so nothing is drawn once the
 * last one ends, the stream being read, the last request for Retry, and where errors and announcements go.
 */
export type AiLink = {
  mounts: number;
  run: AiRun | null;
  last: AiRequest | null;
  report(error: Error): void;
  written(output: string): void;
  stopWatching: (() => void) | null;
};

const links = new WeakMap<object, AiLink>();

export function linkOf(editor: object): AiLink {
  let link = links.get(editor);
  if (link === undefined) {
    link = { mounts: 0, run: null, last: null, report: (error) => console.error(error), written: () => {}, stopWatching: null };
    links.set(editor, link);
  }
  return link;
}
