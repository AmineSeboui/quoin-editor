'use client';

import { useMemo } from 'react';
import type { MathFeature } from './math-feature';
import { renderedMath } from './rendered-math';

type MathOutputProps = { feature: MathFeature; latex: string; displayMode: boolean };

/**
 * A formula as the host's HTML draws it, inserted as it is, or else its LaTeX as monospace text, or that it is empty.
 * Nothing names the host's HTML over it, so the MathML that KaTeX and MathJax draw stays what a screen reader reads.
 */
export function MathOutput({ feature, latex, displayMode }: MathOutputProps) {
  const { labels, renderMath } = feature;
  const html = useMemo(
    () => (latex === '' ? null : renderedMath(renderMath, latex, displayMode)),
    [renderMath, latex, displayMode],
  );
  if (latex === '') return <p className="quoin-math-empty">{labels.emptyEquation}</p>;
  if (html === null) return <pre className="quoin-math-source">{latex}</pre>;
  return <div className="quoin-math-rendered" dangerouslySetInnerHTML={{ __html: html }} />;
}
