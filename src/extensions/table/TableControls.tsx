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
import { useTableKeys } from './use-table-keys';
import { caretTarget, useTableTarget, type TableTarget } from './use-table-target';
import { interceptKeys } from '../../view/input/intercept-keys';

type Held = { readonly target: TableTarget; readonly menu: OpenMenu; readonly opened?: EngineBlock };

type Slot = { readonly block: string; readonly element: HTMLElement };

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
  const [slot, setSlot] = useState<Slot | null>(null);
  const target = useTableTarget(controller, held?.target ?? null);
  useTableKeys(controller, !readOnly);
  const blockId = target?.block ?? null;
  const block = useEditorState(
    controller,
    useCallback((state: EditorState) => (blockId === null ? null : tableBlock(state.doc, blockId)), [blockId]),
  );

  if (held?.menu && held.opened && block && held.opened !== block) {
    setHeld(sameMenuCells(held.opened, block, held.target, held.menu) ? { ...held, opened: block } : null);
  }

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
    return interceptKeys(controller, intercept);
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
  // slot is looked up once that commit is in the document, and kept with the table it was found in.
  useIsomorphicLayoutEffect(() => {
    const element = block === null || readOnly ? null : controlsSlot(controller, block.id);
    const drawn = element && block && { block: block.id, element };
    setSlot((current) => (current?.element === drawn?.element && current?.block === drawn?.block ? current : drawn));
  });

  const placed = slot !== null && slot.block === block?.id && slot.element.isConnected ? slot.element : null;
  if (target === null || block === null || readOnly || placed === null) return null;
  return createPortal(
    <PlacedHandles
      key={block.id}
      controller={controller}
      labels={labels}
      block={block}
      target={target}
      slot={placed}
      menu={held?.menu ?? null}
      onMenu={onMenu}
      onHold={onHold}
      focusRequested={focusFor === block.id}
      onFocused={onFocused}
    />,
    placed,
  );
}

type PlacedHandlesProps = Omit<TableHandlesProps, 'geometry'> & { slot: HTMLElement };

function PlacedHandles({ slot, ...props }: PlacedHandlesProps) {
  const geometry = useTableGeometry(props.controller, props.block.id, slot);
  return geometry === null ? null : <TableHandles {...props} geometry={geometry} />;
}
