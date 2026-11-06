import { useState } from 'react';
import { BlockCanvas, type CodeHighlighter, type QuoinBlock, type QuoinEditorHandle } from 'quoin-editor';
import type { CommentThreads } from 'quoin-editor/comments';
import type { Extension } from 'quoin-editor/engine';
import { QuoinSource } from 'quoin-editor/source';
import { resolveAssetUrl } from '../site/asset-url';
import { playgroundExtensions, type MountSettings } from './playground-extensions';
import type { LabelSets } from './playground-languages';

type Props = {
  mount: MountSettings;
  sets: LabelSets | null;
  threads: CommentThreads;
  shared: Extension[];
  blocks: QuoinBlock[];
  onChange: (next: QuoinBlock[]) => void;
  highlight: CodeHighlighter | undefined;
  readOnly: boolean;
  source: boolean;
};

export function PlaygroundCanvas({
  mount,
  sets,
  threads,
  shared,
  blocks,
  onChange,
  highlight,
  readOnly,
  source,
}: Props) {
  const [extensions] = useState(() => playgroundExtensions({ mount, sets, threads, shared }));
  const [handle, setHandle] = useState<QuoinEditorHandle | null>(null);

  return (
    <>
      <BlockCanvas
        ref={setHandle}
        blocks={blocks}
        onChange={onChange}
        extensions={extensions}
        labels={sets?.core}
        highlight={highlight}
        readOnly={readOnly}
        resolveAssetUrl={resolveAssetUrl}
        aria-label="Playground"
        className="editor-frame"
      />
      {source && handle && (
        <QuoinSource
          controller={handle.controller}
          options={{ resolveAssetUrl }}
          labels={sets?.source}
          className="editor-source"
        />
      )}
    </>
  );
}
