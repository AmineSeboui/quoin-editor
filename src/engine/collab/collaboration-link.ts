import { getPluginState, type EditorState } from '../state/editor-state';
import { createPluginKey, type PluginSpec } from '../state/plugin';

/** One editor's tie to the shared document: its live mounts, how to disconnect, and whether it has warned yet. */
export type CollaborationLink = { mounts: number; disconnect: (() => void) | null; warned: boolean };

const linkKey = createPluginKey<CollaborationLink>('collaborationLink');

// A plugin's state is made once per editor and carried from state to state, so the link is the editor's own however
// many editors share the extension value.
export const linkPlugin: PluginSpec<CollaborationLink> = {
  key: linkKey,
  init: () => ({ mounts: 0, disconnect: null, warned: false }),
  apply: (_tr, link) => link,
};

export const linkOf = (state: EditorState): CollaborationLink => getPluginState(state, linkKey);
