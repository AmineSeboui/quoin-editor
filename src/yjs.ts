'use client';

// The whole main entry, for the reason src/table.ts gives. Presence draws in the canvas, so this entry reaches React;
// the adapter alone still runs in Node or a worker with no DOM.
import './index';

export {
  yjsCollaboration,
  type CollaborationUser,
  type YjsAwareness,
  type YjsCollaboration,
  type YjsCollaborationOptions,
} from './yjs/index';
export type { Seed } from './yjs/seed';
export type { CollaborationAdapter, CollaborationHistory } from './engine/collab/adapter';
export { applyRemote } from './engine/collab/apply-remote';
export { collaborationExtension } from './engine/collab/collaboration-extension';
export { presenceExtension, type PresenceOptions } from './extensions/presence/presence-extension';
export { englishPresenceLabels, type PresenceLabels } from './extensions/presence/presence-labels';
