// Plain logic with no React, so like the engine entry it carries no client directive and runs in Node or a worker.
// The whole engine entry, so that the bundler splits none of the chunks the other entries share around the modules
// this entry reaches.
import './engine/index';

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
