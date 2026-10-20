'use client';

import { useMemo, useRef } from 'react';
import { sanitizeHref } from '../../engine';
import { useNodeKeys } from '../../blocks/void/use-node-keys';
import type { ViewController } from '../../view';

/**
 * Enter on a link card selected as a whole focuses its link, while it has one, and a key typed on it never replaces it.
 * Returns the refs of the block's root and of the card's link.
 */
export function useLinkCardKeys(controller: ViewController, blockId: string, url: string, editable: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const keys = useMemo(() => ({ enter: () => link.current?.focus() }), []);
  useNodeKeys(controller, blockId, editable, sanitizeHref(url) !== null, root, keys);
  return { root, link };
}
