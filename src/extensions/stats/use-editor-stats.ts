import { useEffect, useState } from 'react';
import type { Editor } from '../../engine';
import type { ViewController } from '../../view';
import { countWriting } from './count-writing';

export type EditorStats = { readonly characters: number; readonly words: number; readonly blocks: number };

const statsOf = ({ state }: Editor): EditorStats => ({
  ...countWriting(state.doc, state.schema),
  blocks: state.doc.blocks.length,
});

const sameStats = (a: EditorStats, b: EditorStats) =>
  a.characters === b.characters && a.words === b.words && a.blocks === b.blocks;

/**
 * The characters, words and blocks of the document of `controller`, the one a canvas handle or `useViewController()`
 * gives, counting what was written: the cells of a table without the separators between them, and nothing for an
 * image, a file, an embed or a bookmark. Counted again at most once per animation frame however many edits it holds,
 * and each block only when it changed.
 */
export function useEditorStats(controller: ViewController): EditorStats {
  const [stats, setStats] = useState(() => statsOf(controller.editor));
  useEffect(() => {
    const { editor } = controller;
    let frame = 0;
    const recount = () => {
      frame = 0;
      const next = statsOf(editor);
      setStats((current) => (sameStats(current, next) ? current : next));
    };
    recount();
    const stop = editor.subscribe((_, tr) => {
      if (frame === 0 && tr?.docChanged) frame = requestAnimationFrame(recount);
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [controller]);
  return stats;
}
