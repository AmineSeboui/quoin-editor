import { useMemo, useState, type RefObject } from 'react';
import type { EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { selectionRect } from './selection-rect';
import { virtualAnchor, type MenuSide, type VirtualAnchor } from './virtual-anchor';

type SelectionAnchor = { anchor: RefObject<VirtualAnchor | null>; side: MenuSide };

const ROOM_ABOVE = 56;

// The host the selection starts in, so the anchor follows its scrolling ancestors, the editor's root among them when
// the root itself scrolls.
function selectionHost(controller: ViewController): Element | undefined {
  const [first] = markRanges(controller.editor.state);
  return (first && controller.registry.get(first.block, first.region)) ?? controller.root ?? undefined;
}

/**
 * An anchor at the selected text, renewed with every state so a toolbar follows the text through edits that move it,
 * and the side the toolbar sits on: above, unless less than 56 px of the window is left over the selection.
 */
export function useSelectionAnchor(controller: ViewController, state: EditorState): SelectionAnchor {
  const anchor = useMemo(
    () => ({
      current:
        state.selection === null
          ? null
          : virtualAnchor(
              () => selectionRect(controller),
              () => selectionHost(controller),
            ),
    }),
    [controller, state],
  );
  const [side, setSide] = useState<MenuSide>('top');

  useIsomorphicLayoutEffect(() => {
    const rect = selectionRect(controller);
    if (rect) setSide(rect.top < ROOM_ABOVE ? 'bottom' : 'top');
  }, [controller, state]);

  return { anchor, side };
}
