import { useEffect, type RefObject } from 'react';
import type { FindMatch } from '../../engine/find/find-types';
import type { ViewController } from '../../view';
import { CURRENT_CLASS } from './find-decorations';

const CLEARANCE = '--quoin-find-clearance';

/**
 * Brings the current match into view whenever the panel moves to another one, without taking focus from the panel and
 * below the panel, which is fixed over the page. An edit made in the canvas moves the match along with the text, and
 * scrolls nothing.
 */
export function useScrollToCurrent(
  controller: ViewController,
  panel: RefObject<HTMLElement | null>,
  match: FindMatch | null,
) {
  const key = match && `${match.block}\n${match.region}\n${match.from}`;
  useEffect(() => {
    const owner = panel.current?.ownerDocument;
    const { root } = controller;
    if (key === null || root === null || !panel.current?.contains(owner?.activeElement ?? null)) return;
    root.style.setProperty(CLEARANCE, `${panel.current.getBoundingClientRect().bottom}px`);
    root.querySelector(`.${CURRENT_CLASS}`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [controller, panel, key]);
  useEffect(() => () => void controller.root?.style.removeProperty(CLEARANCE), [controller]);
}
