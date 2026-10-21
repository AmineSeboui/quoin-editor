'use client';

import { defineExtension, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import { sharedOf, type YjsCollaboration } from '../../yjs/index';
import { linkOf } from '../../yjs/presence-link';
import { startPresence } from '../../yjs/presence-session';
import type { ExtensionUI } from '../ui-types';
import { PresenceAvatars } from './PresenceAvatars';
import { presenceDecorations } from './presence-decorations';
import { resolvePresenceLabels, type PresenceLabels } from './presence-labels';
import { presencePlugin } from './presence-plugin';
import { PRESENCE_CARET, remoteCaret } from './RemoteCaret';
import { usePresenceActivity } from './use-presence-activity';
import { usePresenceAnnouncements } from './use-presence-announcements';

export type PresenceOptions = {
  /** Every string presence shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<PresenceLabels>;
};

/**
 * Shows the collaborators that the awareness of `collaboration` knows: their selections tinted with their colour, their
 * carets with their names, avatars beside the blocks they are in, and who joins and leaves through the live region.
 * This editor's selection is shared while it is focused and editable.
 */
export function presenceExtension(collaboration: YjsCollaboration, options: PresenceOptions = {}): Extension {
  const { awareness } = collaboration;
  if (awareness === undefined) throw new Error('presenceExtension needs yjsCollaboration({ awareness })');
  const labels = resolvePresenceLabels(options.labels);
  function Overlay({ controller }: { controller: ViewController }) {
    const link = linkOf(controller.editor);
    usePresenceActivity(controller, link);
    usePresenceAnnouncements(controller, link, labels);
    return <PresenceAvatars controller={controller} labels={labels} />;
  }
  const ui: ExtensionUI = {
    overlays: [Overlay],
    render: { widgets: { [PRESENCE_CARET]: remoteCaret(labels) } },
  };
  return defineExtension({
    name: 'presence',
    // Below the default, so the collaboration it reads has connected before it starts.
    priority: 99,
    plugins: [presencePlugin],
    decorations: presenceDecorations,
    onMount(editor) {
      const link = linkOf(editor);
      const session = startPresence(editor, collaboration, awareness, link, () => sharedOf(collaboration, editor));
      link.session = session;
      return () => {
        session.stop();
        if (link.session === session) link.session = null;
      };
    },
    ui,
  });
}
