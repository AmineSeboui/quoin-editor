import { useEffect, useMemo, useState } from 'react';
import { BlockCanvas, type QuoinBlock, type QuoinEditorHandle } from 'quoin-editor';
import { catalogue, type CatalogueOptions } from 'quoin-editor/catalogue';
import { usePrismHighlighter } from 'quoin-editor/highlight';
import type { MentionResult } from 'quoin-editor/mention';
import { QuoinSource } from 'quoin-editor/source';
import { everyBlock } from '../content/every-block';
import { resolveAssetUrl } from '../site/asset-url';
import { renderDiagram } from '../site/diagram';
import { PlaygroundCode } from './PlaygroundCode';
import { languageNamed, type LabelSets } from './playground-languages';
import { PlaygroundSettings } from './PlaygroundSettings';
import { playgroundSource, type Settings } from './playground-source';

const PEOPLE: MentionResult[] = [
  { id: 'ada', label: 'Ada Lovelace', kind: 'user', description: 'Mathematician' },
  { id: 'grace', label: 'Grace Hopper', kind: 'user', description: 'Computer scientist' },
  { id: 'alan', label: 'Alan Turing', kind: 'user', description: 'Computer scientist' },
];

const search = async (query: string) => PEOPLE.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));

const options = (sets: LabelSets | null): CatalogueOptions => ({
  mention: { search, labels: sets?.mention },
  diagram: { render: renderDiagram, labels: sets?.diagram },
  table: { labels: sets?.table },
  find: { labels: sets?.find },
  toc: { labels: sets?.toc },
  emoji: { labels: sets?.emoji },
  math: { labels: sets?.math },
  embed: { labels: sets?.embed },
  stats: { labels: sets?.stats },
});

type Applied = { code: string; sets: LabelSets | null };

export default function Playground() {
  const [settings, setSettings] = useState<Settings>({
    language: 'en',
    highlighting: true,
    source: false,
    readOnly: false,
  });
  const [applied, setApplied] = useState<Applied>({ code: 'en', sets: null });
  const [blocks, setBlocks] = useState<QuoinBlock[]>(everyBlock);
  const [handle, setHandle] = useState<QuoinEditorHandle | null>(null);
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

  const extensions = useMemo(() => catalogue(options(applied.sets)), [applied]);
  const source = useMemo(() => playgroundSource({ ...settings, language: applied.code }), [settings, applied.code]);

  return (
    <div className="play-layout">
      <PlaygroundSettings settings={settings} onChange={setSettings} loading={applied.code !== wanted} />
      <div className="play-editor">
        <BlockCanvas
          key={applied.code}
          ref={setHandle}
          blocks={blocks}
          onChange={setBlocks}
          extensions={extensions}
          labels={applied.sets?.core}
          highlight={settings.highlighting ? highlight : undefined}
          readOnly={settings.readOnly}
          resolveAssetUrl={resolveAssetUrl}
          aria-label="Playground"
          className="editor-frame"
        />
        {settings.source && handle && (
          <QuoinSource
            controller={handle.controller}
            options={{ resolveAssetUrl }}
            labels={applied.sets?.source}
            className="editor-source"
          />
        )}
      </div>
      <PlaygroundCode source={source} />
    </div>
  );
}
