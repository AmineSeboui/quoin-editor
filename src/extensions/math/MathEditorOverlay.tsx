'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { str } from '../../blocks/str';
import { usePartAnchor } from '../../blocks/void/block-part';
import { focusNode } from '../../blocks/void/select-node';
import type { EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { useRangeAnchor } from '../../menus/floating/use-range-anchor';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import type { MathFeature } from './math-feature';
import { openMath, useMathTarget, type AtomTarget, type MathTarget } from './math-target';
import { MathEditorPopover } from './MathEditorPopover';
import { storeAtomLatex, storeBlockLatex, targetAtom } from './store-latex';
import { useMathAtomOpening } from './use-math-atom-opening';

type Props = { controller: ViewController; feature: MathFeature };

const isThere = (state: EditorState, target: MathTarget): boolean =>
  target.kind === 'block' ? blockById(state.doc, target.block)?.type === 'MATH' : targetAtom(state, target) !== null;

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
    <BlockMathEditor key={target.block} controller={controller} feature={feature} blockId={target.block} />
  ) : (
    <AtomMathEditor key={JSON.stringify(target)} controller={controller} feature={feature} target={target} />
  );
}

function BlockMathEditor({ controller, feature, blockId }: Props & { blockId: string }) {
  const latex = useEditorState(
    controller,
    useCallback((state: EditorState) => str(blockById(state.doc, blockId)?.attrs.latex), [blockId]),
  );
  const anchor = usePartAnchor(controller, blockId, '.quoin-math');
  return (
    <MathEditorPopover
      controller={controller}
      feature={feature}
      anchor={anchor}
      side="bottom"
      latex={latex}
      displayMode
      onStore={(next, refocus) => storeBlockLatex(controller, blockId, next, refocus)}
      onClose={() => openMath(controller, null)}
      onReturn={() => focusNode(controller, blockId)}
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
