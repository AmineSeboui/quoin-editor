import { useEffect, type RefObject } from 'react';
import type { FindMatch } from '../../engine/find/find-types';
import type { ViewController } from '../../view';
import { CURRENT_CLASS } from './find-decorations';

/**
 * Brings the current match into view whenever the panel moves to another one, without taking focus from the panel. An
 * edit made in the canvas moves the match along with the text, and scrolls nothing.
 */
export function useScrollToCurrent(
  controller: ViewController,
  panel: RefObject<HTMLElement | null>,
  match: FindMatch | null,
) {
  const key = match && `${match.block}\n${match.region}\n${match.from}`;
  useEffect(() => {
    const owner = panel.current?.ownerDocument;
    if (key === null || !panel.current?.contains(owner?.activeElement ?? null)) return;
    controller.root?.querySelector(`.${CURRENT_CLASS}`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [controller, panel, key]);
}
