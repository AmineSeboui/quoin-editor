'use client';

import { useEffect, type RefObject } from 'react';
import type { KeyInterceptor, ViewController } from '../../view';
import { insertInCode } from './code-edits';
import { applyCodeEdit } from './code-field';

/**
 * A character typed while the code block is selected as a whole goes at the end of its code, where the editor would
 * replace the block.
 */
export function useTypeIntoCode(
  controller: ViewController,
  blockId: string,
  field: RefObject<HTMLTextAreaElement | null>,
  write: (value: string) => void,
): void {
  useEffect(() => {
    const typeInto: KeyInterceptor = (event) => {
      const area = field.current;
      const { selection } = controller.editor.state;
      if (area === null || selection?.kind !== 'node' || selection.block !== blockId) return false;
      if (event.ctrlKey || event.metaKey || [...event.key].length !== 1) return false;
      event.preventDefault();
      area.focus();
      const end = area.value.length;
      applyCodeEdit(area, insertInCode({ value: area.value, start: end, end }, event.key), write);
      return true;
    };
    controller.keyInterceptors.add(typeInto);
    return () => void controller.keyInterceptors.delete(typeInto);
  }, [controller, blockId, field, write]);
}
