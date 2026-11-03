import { useEffect, useMemo, useState } from 'react';
import { toMarkdown, type Editor, type QuoinBlock, type ToMarkdownOptions } from '../../engine';
import { selectedBlockIds } from '../../engine/state/selection';
import type { ViewController } from '../../view';
import { blockLines, type LineSpan } from './source-lines';

/** The document as markdown, and the lines of it the caret's block is drawn on. */
export type EditorSource = { readonly markdown: string; readonly active: LineSpan | null };

/** How the pane writes the markdown. Pass what the canvas was given, so the pane reads as the document is stored. */
export type SourceOptions = Pick<ToMarkdownOptions, 'comments' | 'lossless' | 'resolveAssetUrl'>;

function sourceOf(editor: Editor, given: SourceOptions): EditorSource {
  const blocks: QuoinBlock[] = editor.getBlocks();
  // One serialiser writes both the document and the prefixes blockLines reads, so the two can never disagree.
  const options: ToMarkdownOptions = { ...given, schema: editor.state.schema };
  const [id] = selectedBlockIds(editor.state.doc, editor.state.selection);
  const index = id === undefined ? -1 : blocks.findIndex((block) => block.id === id);
  return { markdown: toMarkdown(blocks, options), active: blockLines(blocks, index, options) };
}

const sameSource = (a: EditorSource, b: EditorSource) =>
  a.markdown === b.markdown && a.active?.from === b.active?.from && a.active?.to === b.active?.to;

/**
 * The markdown of the document of `controller`, the one a canvas handle or `useViewController()` gives, as `onChange`
 * would hand it back, with the lines the caret's block is drawn on. Read again at most once per animation frame
 * however many edits or caret moves it holds.
 */
export function useEditorSource(controller: ViewController, options: SourceOptions = {}): EditorSource {
  const { comments, lossless, resolveAssetUrl } = options;
  const settings = useMemo<SourceOptions>(
    () => ({ comments, lossless, resolveAssetUrl }),
    [comments, lossless, resolveAssetUrl],
  );
  const [source, setSource] = useState(() => sourceOf(controller.editor, settings));

  useEffect(() => {
    const { editor } = controller;
    let frame = 0;
    const reread = () => {
      frame = 0;
      const next = sourceOf(editor, settings);
      setSource((current) => (sameSource(current, next) ? current : next));
    };
    reread();
    const stop = editor.subscribe(() => {
      if (frame === 0) frame = requestAnimationFrame(reread);
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [controller, settings]);

  return source;
}
