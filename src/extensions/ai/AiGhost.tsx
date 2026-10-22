'use client';

import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { fillGhost } from './ai-ghost-render';
import type { AiEnv } from './ai-env';
import type { AiGhost as Ghost } from './ai-plugin';
import type { AiTarget } from './ai-target';
import { AiBar } from './AiBar';
import { useGhostPlace } from './use-ghost-place';

type AiGhostProps = { env: AiEnv; ghost: Ghost; target: AiTarget; gone: boolean; barId: string };

/**
 * The answer as it streams, drawn over the canvas under the block it is for, in room that block keeps for it, with its
 * bar under it. It is outside the document's text, so the caret, selection, typing and copying never meet it, and
 * inert and hidden from assistive technology until the answer is announced.
 */
export function AiGhost({ env, ghost, target, gone, barId }: AiGhostProps) {
  const layer = useRef<HTMLDivElement>(null);
  const drawn = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    const element = drawn.current;
    if (element === null) return;
    element.setAttribute('inert', '');
    fillGhost(element, ghost.shown);
  }, [ghost.shown]);
  useGhostPlace(env.controller, layer, target.to.block, target.to.region);

  return (
    <div ref={layer} className="quoin-ai-layer">
      <div ref={drawn} className="quoin-ai-ghost" aria-hidden="true" data-phase={ghost.phase} />
      <AiBar env={env} ghost={ghost} gone={gone} barId={barId} />
    </div>
  );
}
