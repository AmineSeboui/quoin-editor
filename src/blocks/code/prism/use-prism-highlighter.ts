'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CodeHighlighter } from '../code-highlighter';
import { highlightWith, type Tokenize } from './prism-highlight';
import { prismSource } from './prism-source';

/**
 * A `highlight` for `BlockCanvas`, drawn by Prism. It is undefined until the grammars have loaded, which draws code
 * plainly for that first render, and the canvas redraws with the highlighter once they arrive. A canvas mounted after
 * they have loaded gets it on its first render.
 */
export function usePrismHighlighter(): CodeHighlighter | undefined {
  const [tokenize, setTokenize] = useState<Tokenize | undefined>(prismSource.loaded);

  useEffect(() => {
    if (tokenize !== undefined) return;
    let live = true;
    // A chunk that fails to load leaves the code plain; lazyLoad lets the next canvas to mount try again.
    void prismSource.load().then(
      (loaded) => void (live && setTokenize(() => loaded)),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [tokenize]);

  return useMemo(
    () => (tokenize === undefined ? undefined : (code, language) => highlightWith(tokenize, code, language)),
    [tokenize],
  );
}
