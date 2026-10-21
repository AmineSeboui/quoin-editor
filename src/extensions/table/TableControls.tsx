'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EditorState, EngineBlock } from '../../engine';
import { isCollapsed } from '../../engine/state/selection';
import { cellSelection } from '../../engine/state/cell-selection';
import { tableBlock } from '../../engine/commands/table-shape';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { useReadOnly } from '../../view/react/use-read-only';
import { controlsSlot } from './controls-slot';
import { sameMenuCells } from './menu-cells';
import type { TableLabels } from './table-labels';
import { TableHandles, type OpenMenu, type TableHandlesProps } from './TableHandles';
import { useTableGeometry } from './use-table-geometry';
import { useCutCells } from './use-cut-cells';
import { caretTarget, useTableTarget, type TableTarget } from './use-table-target';

type Held = { readonly target: TableTarget; readonly menu: OpenMenu; readonly opened?: EngineBlock };

const isFocusKey = (event: KeyboardEvent) =>
  event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

// The bubble toolbar takes Alt+F10 while text is selected inside a cell; a caret or a cell range has none.
const takesFocusKey = (state: EditorState) => isCollapsed(state.selection) || cellSelection(state) !== null;

/**
 * The controls of one table at a time, drawn into its scroller: the one under the pointer, or the one holding the caret.
 * A menu, a column drag or Alt+F10 hold them on their table until they are done.
 */
export function TableControls({ controller, labels }: { controller: ViewController; labels: TableLabels }) {
  const readOnly = useReadOnly(controller);
  const [held, setHeld] = useState<Held | null>(null);
  const [focusFor, setFocusFor] = useState<string | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const target = useTableTarget(controller, held?.target ?? null);
  useCutCells(controller);
  const blockId = target?.block ?? null;
  const block = useEditorState(
    controller,
    useCallback((state: EditorState) => (blockId === null ? null : tableBlock(state.doc, blockId)), [blockId]),
  );

  if (held?.menu && held.opened && block && !sameMenuCells(held.opened, block, held.target, held.menu)) setHeld(null);

  useEffect(() => {
    if (!readOnly && block !== null) return;
    setHeld(null);
    setFocusFor(null);
  }, [readOnly, block]);

  useEffect(() => {
    if (readOnly) return;
    const intercept: KeyInterceptor = (event) => {
      const { state } = controller.editor;
      const caret = caretTarget(state);
      if (!isFocusKey(event) || isComposingKey(controller, event) || caret === null || !takesFocusKey(state)) return false;
      event.preventDefault();
      setHeld({ target: caret, menu: null });
      setFocusFor(caret.block);
      return true;
    };
    controller.keyInterceptors.add(intercept);
    return () => void controller.keyInterceptors.delete(intercept);
  }, [controller, readOnly]);

  const onMenu = useCallback(
    (menu: OpenMenu) => setHeld(menu === null || target === null || block === null ? null : { target, menu, opened: block }),
    [target, block],
  );
  const onHold = useCallback((hold: boolean) => setHeld(hold && target !== null ? { target, menu: null } : null), [target]);
  const onFocused = useCallback(() => {
    setFocusFor(null);
    setHeld((current) => (current?.menu === null ? null : current));
  }, []);

  // The table draws its slot in the same commit as this, when the canvas turns editable or the table remounts, so the
  // slot is looked up once that commit is in the document.
  useIsomorphicLayoutEffect(() => {
    const drawn = block === null || readOnly ? null : controlsSlot(controller, block.id);
    setSlot((current) => (current === drawn ? current : drawn));
  });

  if (target === null || block === null || readOnly || slot === null || !slot.isConnected) return null;
  return createPortal(
    <PlacedHandles
      key={block.id}
      controller={controller}
      labels={labels}
      block={block}
      target={target}
      slot={slot}
      menu={held?.menu ?? null}
      onMenu={onMenu}
      onHold={onHold}
      focusRequested={focusFor === block.id}
      onFocused={onFocused}
    />,
    slot,
  );
}

type PlacedHandlesProps = Omit<TableHandlesProps, 'geometry'> & { slot: HTMLElement };

function PlacedHandles({ slot, ...props }: PlacedHandlesProps) {
  const geometry = useTableGeometry(props.controller, props.block.id, slot);
  return geometry === null ? null : <TableHandles {...props} geometry={geometry} />;
}
