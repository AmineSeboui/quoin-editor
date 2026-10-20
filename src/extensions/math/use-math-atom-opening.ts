'use client';

import { useEffect } from 'react';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { selectedAtom } from '../atoms/atom-place';
import { clickedAtom } from '../atoms/clicked-atom';
import { plainEnter } from '../atoms/plain-enter';
import { MATH_ATOMS } from './math-feature';
import { atomTarget, openMath } from './math-target';

/**
 * Opens the math editor on a formula in a line of an editable canvas: on a click on it, and on Enter while it is
 * selected. A Shift+click extends the selection instead.
 */
export function useMathAtomOpening(controller: ViewController, editable: boolean): void {
  useEffect(() => {
    const root = controller.root;
    if (!editable || root === null) return;
    const intercept: KeyInterceptor = (event) => {
      if (!plainEnter(event) || isComposingKey(controller, event)) return false;
      const place = selectedAtom(controller.editor.state, MATH_ATOMS);
      if (place === null) return false;
      event.preventDefault();
      openMath(controller, atomTarget(place));
      return true;
    };
    const onClick = (event: MouseEvent) => {
      const place = event.shiftKey ? null : clickedAtom(controller, event.target, MATH_ATOMS);
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
