'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { textSelection, type Pos } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { inlineLength } from '../../engine/model/inline';
import type { KeyInterceptor, ViewController } from '../../view';
import { insertBlocks } from '../insert-blocks';
import { useNodeKeys, type NodeKeys } from '../void/use-node-keys';
import { interceptKeys } from '../../view/input/intercept-keys';

function captionEnd(controller: ViewController, blockId: string): Pos {
  const caption = blockById(controller.editor.state.doc, blockId)?.regions.caption ?? [];
  return { block: blockId, region: 'caption', offset: inlineLength(caption) };
}

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
  const caption = useMemo<NodeKeys>(() => {
    if (!picture) return {};
    return {
      // Called from an effect, where the canvas's own flush is refused, so the caret goes to the editor, which the view
      // then follows.
      enter() {
        const { editor } = controller;
        editor.dispatch(editor.createTransaction().setSelection(textSelection(captionEnd(controller, blockId))));
        controller.focus();
      },
      type(key) {
        controller.focus(captionEnd(controller, blockId));
        controller.edit(() => controller.editor.insertText(key));
      },
    };
  }, [controller, blockId, picture]);
  useNodeKeys(controller, blockId, editable, true, root, caption);

  useEffect(() => {
    if (!editable) return;
    const intercept: KeyInterceptor = (event) => {
      const { selection } = controller.editor.state;
      const inCaption =
        selection?.kind === 'text' &&
        selection.head.block === blockId &&
        !menuOpenOn(controller.registry.get(blockId, 'caption'));
      if (!inCaption || !plainEnter(event)) return false;
      controller.run(insertBlocks([{ type: 'MARKDOWN' }], 'text', blockId));
      event.preventDefault();
      return true;
    };
    return interceptKeys(controller, intercept);
  }, [controller, blockId, editable]);
}
