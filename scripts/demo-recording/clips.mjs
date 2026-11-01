import { aiSession } from './ai-session.mjs';
import { authoringSession, emptyDocument } from './authoring-session.mjs';
import { collaborationSession, sharedDocument } from './collaboration-session.mjs';

/** Each animation the README and the docs site show: the page it is filmed on, how that page is framed, and the script. */
export const clips = [
  {
    name: 'hero',
    file: 'quoin-demo.gif',
    path: '',
    css: 'html { font-size: 20px; } main { padding-top: 110px !important; }',
    prepare: emptyDocument,
    session: authoringSession,
  },
  {
    name: 'collaboration',
    file: 'quoin-collaboration.gif',
    path: 'collaboration/',
    css: 'html { font-size: 24px; } main { padding-top: 100px !important; }',
    prepare: sharedDocument,
    session: collaborationSession,
  },
  {
    name: 'ai',
    file: 'quoin-ai.gif',
    path: 'ai/',
    css: 'html { font-size: 19px; } main { max-width: 920px; margin-inline: auto; padding-top: 72px !important; }',
    prepare: async () => {},
    session: aiSession,
  },
];
