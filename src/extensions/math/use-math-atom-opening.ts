'use client';

import { useEffect } from 'react';
import { domMapOf, type KeyInterceptor, type ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { atomBeforeCaret, atomPlaceAt, selectedAtom, type AtomPlace } from '../atoms/atom-place';
import { MATH_ATOMS } from './math-feature';
import { atomTarget, openMath } from './math-target';

const plainEnter = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;

function clickedFormula(controller: ViewController, target: EventTarget | null): AtomPlace | null {
  const element = (target as Element | null)?.closest?.('[data-quoin-atom="math"]');
  if (!element) return null;
  const host = controller.registry.locate(element);
  const offset = host === null ? null : domMapOf(host.element)?.fromDom(element, 0);
  if (host === null || offset === null || offset === undefined) return null;
  return atomPlaceAt(controller.editor.state, { block: host.block, region: host.region, offset }, MATH_ATOMS);
}

/**
 * Opens the math editor on a formula in a line of an editable canvas: on a click on it, and on Enter while it is
 * selected or the caret is right after it.
 */
export function useMathAtomOpening(controller: ViewController, editable: boolean): void {
  useEffect(() => {
    const root = controller.root;
    if (!editable || root === null) return;
    const intercept: KeyInterceptor = (event) => {
      if (!plainEnter(event) || isComposingKey(controller, event)) return false;
      const { state } = controller.editor;
      const place = selectedAtom(state, MATH_ATOMS) ?? atomBeforeCaret(state, MATH_ATOMS);
      if (place === null) return false;
      event.preventDefault();
      openMath(controller, atomTarget(place));
      return true;
    };
    const onClick = (event: MouseEvent) => {
      const place = clickedFormula(controller, event.target);
      if (place !== null) openMath(controller, atomTarget(place));
    };
    controller.keyInterceptors.add(intercept);
    root.addEventListener('click', onClick);
    return () => {
      controller.keyInterceptors.delete(intercept);
      root.removeEventListener('click', onClick);
    };
  }, [controller, editable]);
}
