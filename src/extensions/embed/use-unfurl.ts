'use client';

import { useEffect } from 'react';
import { str } from '../../blocks/str';
import { useQuoin } from '../../context';
import { setAttrsStep } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { toError } from '../../to-error';
import type { ViewController } from '../../view';
import type { Unfurl } from './embed-feature';
import { unfurledPatch } from './unfurled-patch';

type Asks = { readonly asked: Set<string>; readonly drawn: Map<string, number> };

const canvases = new WeakMap<ViewController, Asks>();

function asksOf(controller: ViewController): Asks {
  let asks = canvases.get(controller);
  if (asks === undefined) {
    asks = { asked: new Set(), drawn: new Map() };
    canvases.set(controller, asks);
  }
  return asks;
}

const keyOf = (blockId: string, url: string) => JSON.stringify([blockId, url]);

// Once per block and address, so a remount, StrictMode or a result that was refused never asks again. A result that
// lands where nothing can take it forgets the address, which is asked again once the block is drawn with it.
function askFirstTime(controller: ViewController, blockId: string, url: string): boolean {
  const { asked } = asksOf(controller);
  const key = keyOf(blockId, url);
  if (asked.has(key)) return false;
  asked.add(key);
  return true;
}

function bookmarkAt(controller: ViewController, blockId: string, url: string) {
  const block = blockById(controller.editor.state.doc, blockId);
  return block?.type === 'BOOKMARK' && str(block.attrs.url) === url ? block : undefined;
}

async function unfurlInto(
  controller: ViewController,
  blockId: string,
  url: string,
  unfurl: Unfurl,
  onError: (error: Error) => void,
): Promise<void> {
  const { asked, drawn } = asksOf(controller);
  let found: unknown;
  try {
    found = await unfurl(url);
  } catch (cause) {
    if (bookmarkAt(controller, blockId, url) && drawn.get(blockId)) onError(toError(cause));
    return;
  }
  const patch = unfurledPatch(found);
  if (patch === null) return;
  const block = bookmarkAt(controller, blockId, url);
  if (block === undefined || !drawn.get(blockId) || controller.readOnly) {
    asked.delete(keyOf(blockId, url));
    return;
  }
  if (str(block.attrs.title) !== '') return;
  // Through the editor itself, so the view follows the change only where focus already is: written through the
  // controller while focus is on nothing, the selection would be drawn into the text and take focus there.
  const { editor } = controller;
  editor.dispatch(editor.createTransaction().step(setAttrsStep(blockId, patch)).setMeta('addToHistory', false));
}

/**
 * Asks the host's unfurl about a bookmark's address once, while it is given, and writes what it found out of the undo
 * history, as long as the block is drawn, still untitled at that address, and the canvas editable. An unfurl that
 * throws or rejects is reported to `onError` while the bookmark is still drawn at that address.
 */
export function useUnfurl(controller: ViewController, blockId: string, url: string, unfurl: Unfurl | undefined): void {
  const { onError } = useQuoin();
  useEffect(() => {
    const { drawn } = asksOf(controller);
    drawn.set(blockId, (drawn.get(blockId) ?? 0) + 1);
    return () => {
      const left = (drawn.get(blockId) ?? 1) - 1;
      if (left > 0) drawn.set(blockId, left);
      else drawn.delete(blockId);
    };
  }, [controller, blockId]);
  useEffect(() => {
    if (unfurl === undefined || url === '' || !askFirstTime(controller, blockId, url)) return;
    void unfurlInto(controller, blockId, url, unfurl, onError);
  }, [controller, blockId, url, unfurl, onError]);
}
