import { useEffect, useState } from 'react';
import type { QuoinBlock } from 'quoin-editor';
import { usePrismHighlighter } from 'quoin-editor/highlight';
import { everyBlock } from '../content/every-block';
import { PlaygroundCanvas } from './PlaygroundCanvas';
import { PlaygroundCode } from './PlaygroundCode';
import { seedThreads } from './playground-comments';
import { languageNamed, type LabelSets } from './playground-languages';
import { PlaygroundPeer } from './PlaygroundPeer';
import { playgroundSource, type Settings } from './playground-source';
import { PlaygroundSettings } from './PlaygroundSettings';
import { usePlaygroundCollaboration } from './use-playground-collaboration';

type Applied = { code: string; sets: LabelSets | null };

const START: Settings = {
  language: 'en',
  comments: false,
  ai: false,
  collaboration: false,
  highlighting: true,
  source: false,
  readOnly: false,
};

export default function Playground() {
  const [settings, setSettings] = useState<Settings>(START);
  const [applied, setApplied] = useState<Applied>({ code: 'en', sets: null });
  const [blocks, setBlocks] = useState<QuoinBlock[]>(everyBlock);
  const [threads] = useState(seedThreads);
  const [channel] = useState(() => `quoin-playground-${crypto.randomUUID()}`);
  const highlight = usePrismHighlighter();

  const wanted = settings.language;
  useEffect(() => {
    if (applied.code === wanted) return;
    let live = true;
    languageNamed(wanted)
      .load()
      .then(
        (sets) => {
          if (live) setApplied({ code: wanted, sets });
        },
        (error: unknown) => console.error(`The ${wanted} pack did not load.`, error),
      );
    return () => {
      live = false;
    };
  }, [wanted, applied.code]);

  const { comments, ai, collaboration } = settings;
  const pair = usePlaygroundCollaboration(collaboration, channel, applied.sets?.presence);
  const mounted = `${applied.code}:${comments}:${ai}:${collaboration}`;

  // With collaboration on, the canvas waits a tick for the pair: it reads its extensions once, so mounting before
  // they exist would leave it out of the shared document for good.
  const ready = !collaboration || pair !== null;

  return (
    <div className="play-layout">
      <PlaygroundSettings settings={settings} onChange={setSettings} loading={applied.code !== wanted} />
      <div className="play-editor">
        {ready && (
          <PlaygroundCanvas
            key={mounted}
            mount={{ comments, ai, collaboration }}
            sets={applied.sets}
            threads={threads}
            shared={pair?.writer ?? []}
            blocks={blocks}
            onChange={setBlocks}
            highlight={settings.highlighting ? highlight : undefined}
            readOnly={settings.readOnly}
            source={settings.source}
          />
        )}
        {pair && (
          <PlaygroundPeer
            key={`peer:${mounted}`}
            shared={pair.partner}
            sets={applied.sets}
            highlight={settings.highlighting ? highlight : undefined}
          />
        )}
      </div>
      <PlaygroundCode source={playgroundSource({ ...settings, language: applied.code })} />
    </div>
  );
}
