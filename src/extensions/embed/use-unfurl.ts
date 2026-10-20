'use client';

import { useEffect, useRef } from 'react';
import { str } from '../../blocks/str';
import { setAttrsStep } from '../../engine';
import { blockById } from '../../engine/model/doc';
import type { ViewController } from '../../view';
import type { Unfurl } from './embed-feature';
import { unfurledPatch } from './unfurled-patch';

const asked = new WeakMap<ViewController, Set<string>>();

// Once per block and address for the life of the canvas, so a remount, StrictMode or a result that was refused never
// asks again.
function askFirstTime(controller: ViewController, blockId: string, url: string): boolean {
  const keys = asked.get(controller) ?? new Set<string>();
  asked.set(controller, keys);
  const key = JSON.stringify([blockId, url]);
  if (keys.has(key)) return false;
  keys.add(key);
  return true;
}

function stillUntitled(controller: ViewController, blockId: string, url: string): boolean {
  const block = blockById(controller.editor.state.doc, blockId);
  return block?.type === 'BOOKMARK' && str(block.attrs.url) === url && str(block.attrs.title) === '';
}

async function unfurlInto(
  controller: ViewController,
  blockId: string,
  url: string,
  unfurl: Unfurl,
  mounted: () => boolean,
): Promise<void> {
  let found: unknown;
  try {
    found = await unfurl(url);
  } catch {
    return;
  }
  const patch = unfurledPatch(found);
  if (patch === null || !mounted() || controller.readOnly || !stillUntitled(controller, blockId, url)) return;
  // Through the editor itself, so the view follows the change only where focus already is: written through the
  // controller while focus is on nothing, the selection would be drawn into the text and take focus there.
  const { editor } = controller;
  editor.dispatch(editor.createTransaction().step(setAttrsStep(blockId, patch)).setMeta('addToHistory', false));
}

/**
 * Asks the host's unfurl about a bookmark's address once, while it is given, and writes what it found out of the undo
 * history, as long as the block is drawn, still untitled at that address, and the canvas editable.
 */
export function useUnfurl(controller: ViewController, blockId: string, url: string, unfurl: Unfurl | undefined): void {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => void (mounted.current = false);
  }, []);
  useEffect(() => {
    if (unfurl === undefined || url === '' || !askFirstTime(controller, blockId, url)) return;
    void unfurlInto(controller, blockId, url, unfurl, () => mounted.current);
  }, [controller, blockId, url, unfurl]);
}
