'use client';

import { useEffect, type RefObject } from 'react';
import type { Pos } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { inlineLength } from '../../engine/model/inline';
import type { KeyInterceptor, ViewController } from '../../view';
import { insertBlocks } from '../insert-blocks';
import { useVoidEditing } from '../void/use-void-editing';

const CONTROL = 'input:not([disabled]), button:not([disabled])';

function captionEnd(controller: ViewController, blockId: string): Pos {
  const caption = blockById(controller.editor.state.doc, blockId)?.regions.caption ?? [];
  return { block: blockId, region: 'caption', offset: inlineLength(caption) };
}

function typeIntoCaption(controller: ViewController, blockId: string, text: string): void {
  controller.focus(captionEnd(controller, blockId));
  controller.edit(() => controller.editor.insertText(text));
}

const typed = (event: KeyboardEvent): boolean => !event.ctrlKey && !event.metaKey && [...event.key].length === 1;

const plainEnter = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;

// A suggestion menu open on a host makes it the combobox of its list, and Enter is the menu's.
const menuOpenOn = (host: HTMLElement | undefined): boolean => host?.getAttribute('aria-expanded') === 'true';

/**
 * Enter on the selected image, or a menu that inserts one, puts the caret at the end of its caption, or focus on the
 * upload button of an image with no picture yet. A key typed on the selected image goes into its caption rather than
 * replacing it, and Enter in the caption goes on in a new line under the image.
 */
export function useImageKeys(
  controller: ViewController,
  blockId: string,
  picture: boolean,
  editable: boolean,
  root: RefObject<HTMLElement | null>,
): void {
  const { editing, stop } = useVoidEditing(controller, blockId, editable);

  useEffect(() => {
    if (!editing) return;
    stop();
    if (picture) controller.focus(captionEnd(controller, blockId));
    else root.current?.querySelector<HTMLElement>(CONTROL)?.focus();
  }, [editing, stop, picture, controller, blockId, root]);

  useEffect(() => {
    if (!editable) return;
    const intercept: KeyInterceptor = (event) => {
      const { selection } = controller.editor.state;
      const selected = selection?.kind === 'node' && selection.block === blockId;
      const inCaption =
        selection?.kind === 'text' &&
        selection.head.block === blockId &&
        !menuOpenOn(controller.registry.get(blockId, 'caption'));
      if (selected && typed(event)) {
        if (picture) typeIntoCaption(controller, blockId, event.key);
      } else if (inCaption && plainEnter(event)) {
        controller.run(insertBlocks([{ type: 'MARKDOWN' }], 'text', blockId));
      } else {
        return false;
      }
      event.preventDefault();
      return true;
    };
    controller.keyInterceptors.add(intercept);
    return () => void controller.keyInterceptors.delete(intercept);
  }, [controller, blockId, picture, editable]);
}
