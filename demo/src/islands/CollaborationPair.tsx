import { useState } from 'react';
import * as Y from 'yjs';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { collaborationDocument } from '../content/collaboration-document';
import { presenceExtension } from 'quoin-editor/presence';
import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';
import { broadcastProvider } from './broadcast-provider';

type Person = { name: string; color: string; seeds: boolean };

function collaborator(channel: string, { name, color, seeds }: Person) {
  const doc = new Y.Doc();
  const { awareness } = broadcastProvider(doc, channel);
  const collaboration = yjsCollaboration({ doc, awareness, user: { name, color }, seed: seeds ? 'if-empty' : false });
  return [collaborationExtension(collaboration), presenceExtension(collaboration)];
}

function Side({ channel, person }: { channel: string; person: Person }) {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(person.seeds ? collaborationDocument : []);
  const [extensions] = useState(() => collaborator(channel, person));
  return (
    <section className="collab-side" aria-label={`${person.name}’s editor`}>
      <h2>{person.name}</h2>
      <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} aria-label={`${person.name}’s copy`} className="editor-frame" />
    </section>
  );
}

export default function CollaborationPair() {
  const [channel] = useState(() => `quoin-site-${crypto.randomUUID()}`);
  return (
    <div className="collab-pair">
      <Side channel={channel} person={{ name: 'Ada', color: '#1d4ed8', seeds: true }} />
      <Side channel={channel} person={{ name: 'Grace', color: '#b91c1c', seeds: false }} />
    </div>
  );
}
