'use client';

import { useEffect, type RefObject } from 'react';
import type { KeyInterceptor, ViewController } from '../../view';
import { insertInCode, type CodeField } from './code-edits';
import { interceptKeys } from '../../view/input/intercept-keys';

/**
 * A character typed while the code block is selected as a whole goes at the end of its code, where the editor would
 * replace the block.
 */
export function useTypeIntoCode(
  controller: ViewController,
  blockId: string,
  field: RefObject<HTMLTextAreaElement | null>,
  edit: (next: CodeField) => void,
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
      edit(insertInCode({ value: area.value, start: end, end }, event.key));
      return true;
    };
    return interceptKeys(controller, typeInto);
  }, [controller, blockId, field, edit]);
}
