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
import { openMath, useMathTarget, type AtomTarget, type BlockTarget, type MathTarget } from './math-target';
import { MathEditorPopover } from './MathEditorPopover';
import { storeAtomLatex, storeBlockLatex, targetAtom, targetBlockThere } from './store-latex';
import { useMathAtomOpening } from './use-math-atom-opening';

type Props = { controller: ViewController; feature: MathFeature };

const isThere = (state: EditorState, target: MathTarget): boolean =>
  target.kind === 'block' ? targetBlockThere(state, target) : targetAtom(state, target) !== null;

/**
 * The editor of the math block or the formula in a line that a click or Enter opened, while it is still there and the
 * canvas is editable.
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
    <AtomMathEditor key={JSON.stringify(target)} controller={controller} feature={feature} target={target} />
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

function AtomMathEditor({ controller, feature, target }: Props & { target: AtomTarget }) {
  const { block, region, offset } = target;
  const range = useMemo(() => ({ block, region, from: offset, to: offset + 1 }), [block, region, offset]);
  const { anchor, side } = useRangeAnchor(controller, range);
  const removed = useRef(false);
  const onStore = (latex: string, refocus: boolean) => {
    removed.current = latex === '';
    storeAtomLatex(controller, target, latex, refocus);
  };
  return (
    <MathEditorPopover
      controller={controller}
      feature={feature}
      anchor={anchor}
      side={side}
      latex={target.latex}
      displayMode={false}
      onStore={onStore}
      onClose={() => openMath(controller, null)}
      onReturn={() => controller.focus({ block, region, offset: removed.current ? offset : offset + 1 })}
    />
  );
}
