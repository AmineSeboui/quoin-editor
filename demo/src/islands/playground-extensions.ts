import { aiExtension } from 'quoin-editor/ai';
import { catalogue, type CatalogueOptions } from 'quoin-editor/catalogue';
import type { CommentThreads } from 'quoin-editor/comments';
import type { Extension } from 'quoin-editor/engine';
import { searchPeople } from '../content/people';
import { renderDiagram } from '../site/diagram';
import { liveModel } from './live-model';
import { reviewing } from './playground-comments';
import type { LabelSets } from './playground-languages';
import type { Settings } from './playground-source';
import { simulatedModel } from './simulated-model';

const model = import.meta.env.MODE === 'ai' ? liveModel : simulatedModel;

const catalogueOptions = (sets: LabelSets | null): CatalogueOptions => ({
  mention: { search: searchPeople, labels: sets?.mention },
  diagram: { render: renderDiagram, labels: sets?.diagram },
  table: { labels: sets?.table },
  find: { labels: sets?.find },
  toc: { labels: sets?.toc },
  emoji: { labels: sets?.emoji },
  math: { labels: sets?.math },
  embed: { labels: sets?.embed },
  stats: { labels: sets?.stats },
});

/** The settings a canvas can only read while it mounts, as against the props it answers to at once. */
export type MountSettings = Pick<Settings, 'comments' | 'ai' | 'collaboration'>;

type Built = { mount: MountSettings; sets: LabelSets | null; threads: CommentThreads; shared: Extension[] };

/**
 * Everything the canvas is mounted with. A canvas reads its extensions once, so this is built inside a component the
 * page remounts rather than recomputed in place.
 */
export function playgroundExtensions({ mount, sets, threads, shared }: Built): Extension[] {
  return [
    ...catalogue(catalogueOptions(sets)),
    ...(mount.comments ? [reviewing(threads, sets?.comments)] : []),
    ...(mount.ai ? [aiExtension({ stream: model, labels: sets?.ai })] : []),
    ...shared,
  ];
}

/**
 * The second collaborator draws the same blocks, so it needs the same catalogue: without it a table, an equation or a
 * diagram arrives as a type it has no renderer for and it draws an unsupported block. Comments and AI are the first
 * editor's, not the document's.
 */
export const peerExtensions = (sets: LabelSets | null, shared: Extension[]): Extension[] => [
  ...catalogue(catalogueOptions(sets)),
  ...shared,
];
