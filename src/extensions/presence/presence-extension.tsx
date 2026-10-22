'use client';

import { devWarn } from '../../dev-warn';
import { defineExtension, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import { sharedOf } from '../../yjs/bound';
import type { YjsCollaboration } from '../../yjs/index';
import type { ExtensionUI } from '../ui-types';
import { PresenceAvatars } from './PresenceAvatars';
import { presenceDecorations } from './presence-decorations';
import { resolvePresenceLabels, type PresenceLabels } from './presence-labels';
import { linkOf } from './presence-link';
import { presencePlugin } from './presence-plugin';
import { startPresence } from './presence-session';
import { RemoteCarets } from './RemoteCarets';
import { usePresenceActivity } from './use-presence-activity';
import { usePresenceAnnouncements } from './use-presence-announcements';

const UNBOUND = 'presenceExtension shares nothing without collaborationExtension.';

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
    return (
      <>
        <RemoteCarets controller={controller} labels={labels} />
        <PresenceAvatars controller={controller} labels={labels} />
      </>
    );
  }
  const ui: ExtensionUI = { overlays: [Overlay] };
  return defineExtension({
    name: 'presence',
    // Below the default, so the collaboration it reads has connected before it starts.
    priority: 99,
    plugins: [presencePlugin],
    decorations: presenceDecorations,
    onMount(editor) {
      const link = linkOf(editor);
      if (sharedOf(collaboration, editor) === null) devWarn(UNBOUND);
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
