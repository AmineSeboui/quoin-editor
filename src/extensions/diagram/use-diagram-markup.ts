'use client';

import { useEffect, useState } from 'react';
import type { DiagramFeature } from './diagram-feature';
import { resolveDiagram } from './resolve-diagram';

/**
 * The markup for a block's source, drawn again whenever the source changes. The drawing already on screen stays while
 * the next one is made, because a renderer that parses and lays out takes long enough that clearing it first would
 * blink the block away on every keystroke.
 */
export function useDiagramMarkup(feature: DiagramFeature, code: string, language: string, draws: boolean): string | null {
  const [markup, setMarkup] = useState<string | null>(null);
  const { render } = feature;

  useEffect(() => {
    if (!draws) return setMarkup(null);
    let live = true;
    void resolveDiagram(render, code, language).then((drawn) => {
      if (live) setMarkup(drawn);
    });
    return () => {
      live = false;
    };
  }, [render, code, language, draws]);

  return draws ? markup : null;
}
