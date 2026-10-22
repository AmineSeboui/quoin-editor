import type { CommandFactories, Editor } from '../../engine';

/** The part of an editor comments use, whatever commands it has. */
export type CommentsEditor = Pick<Editor<CommandFactories>, 'state' | 'dispatch' | 'createTransaction' | 'subscribe'>;

/**
 * What comments know of one editor across its mounts: how many views have it mounted, so an answer from the host that
 * comes after the last one ends changes nothing, and where errors go, the canvas's `onError` once it has drawn.
 */
export type CommentsLink = { mounts: number; report(error: Error): void };

const links = new WeakMap<object, CommentsLink>();

export function linkOf(editor: object): CommentsLink {
  let link = links.get(editor);
  if (link === undefined) {
    link = { mounts: 0, report: (error) => console.error(error) };
    links.set(editor, link);
  }
  return link;
}
