import type { ComponentType } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

/** Each interactive piece a page can hold, loaded only on the pages that hold it. */
export const islands = {
  home: () => import('./HomeEditor'),
  blocks: () => import('./BlocksEditor'),
  collaboration: () => import('./CollaborationPair'),
  ai: () => import('./AiEditor'),
  comments: () => import('./CommentsEditor'),
} satisfies Record<string, Loader>;

export type IslandName = keyof typeof islands;
