'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePartAnchor } from '../../blocks/void/block-part';
import { focusNode } from '../../blocks/void/select-node';
import type { EditorState } from '../../engine';
import { useRangeAnchor } from '../../menus/floating/use-range-anchor';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import type { MathFeature } from './math-feature';
import { openMath, useMathTarget } from './math-target';
import type { AtomTarget, BlockTarget, InsertTarget, MathTarget } from './math-target';
import { MathEditorPopover } from './MathEditorPopover';
import {
  insertFormula,
  storeAtomLatex,
  storeBlockLatex,
  targetAtom,
  targetBlockThere,
  targetLineThere,
} from './store-latex';
import { useMathAtomOpening } from './use-math-atom-opening';

type Props = { controller: ViewController; feature: MathFeature };

function isThere(state: EditorState, target: MathTarget): boolean {
  if (target.kind === 'block') return targetBlockThere(state, target);
  return target.kind === 'atom' ? targetAtom(state, target) !== null : targetLineThere(state, target);
}

/**
 * The editor of the math block or the formula in a line that a click, Enter or the `/` menu opened, while what it edits
 * is still there and the canvas is editable.
 */
export function MathEditorOverlay({ controller, feature }: Props) {
  const readOnly = useReadOnly(controller);
  const target = useMathTarget(controller);
  const there = useEditorState(
    controller,
    useCallback((state: EditorState) => target !== null && isThere(state, target), [target]),
  );
  useMathAtomOpening(controller, !readOnly);
  const shown = target !== null && there && !readOnly;
  useEffect(() => {
    if (target !== null && !shown) openMath(controller, null);
  }, [controller, target, shown]);

  if (!shown) return null;
  return target.kind === 'block' ? (
    <BlockMathEditor key={JSON.stringify(target)} controller={controller} feature={feature} target={target} />
  ) : (
    <InlineMathEditor key={JSON.stringify(target)} controller={controller} feature={feature} target={target} />
  );
}

function BlockMathEditor({ controller, feature, target }: Props & { target: BlockTarget }) {
  const anchor = usePartAnchor(controller, target.block, '.quoin-math');
  return (
    <MathEditorPopover
      controller={controller}
      feature={feature}
      anchor={anchor}
      side="bottom"
      latex={target.latex}
      displayMode
      onStore={(next, refocus) => storeBlockLatex(controller, target, next, refocus)}
      onClose={() => openMath(controller, null)}
      onReturn={() => focusNode(controller, target.block)}
    />
  );
}

// A formula in the line to edit, or one to write at the caret.
function InlineMathEditor({ controller, feature, target }: Props & { target: AtomTarget | InsertTarget }) {
  const { block, region, offset } = target;
  const editing = target.kind === 'atom';
  const range = useMemo(
    () => ({ block, region, from: offset, to: editing ? offset + 1 : offset }),
    [block, region, offset, editing],
  );
  const { anchor, side } = useRangeAnchor(controller, range);
  // Whether a formula stands at the offset once the editor closes, which the caret goes back after.
  const kept = useRef(editing);
  const onStore = (latex: string, refocus: boolean) => {
    kept.current = latex !== '';
    if (target.kind === 'atom') storeAtomLatex(controller, target, latex, refocus);
    else insertFormula(controller, target, latex, refocus);
  };
  return (
    <MathEditorPopover
      controller={controller}
      feature={feature}
      anchor={anchor}
      side={side}
      latex={editing ? target.latex : ''}
      displayMode={false}
      onStore={onStore}
      onClose={() => openMath(controller, null)}
      onReturn={() => controller.focus({ block, region, offset: kept.current ? offset + 1 : offset })}
    />
  );
}
