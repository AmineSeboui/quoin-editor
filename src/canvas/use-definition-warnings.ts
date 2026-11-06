'use client';

import { useEffect } from 'react';
import { definedTypedInPlace, definedWithoutEditor } from '../blocks/block-drawing';
import { devWarn } from '../dev-warn';
import type { AnyBlockDefinition } from '../registry';

export function useDefinitionWarnings(definitions: readonly AnyBlockDefinition[], readOnly: boolean): void {
  useEffect(() => {
    if (readOnly) return;
    for (const type of definedTypedInPlace(definitions)) {
      devWarn(
        `the block type "${type}" has a definition of its own, which only a read-only canvas draws. ` +
          `An editable canvas keeps drawing ${type} blocks itself, since they are typed into in place.`,
      );
    }
    for (const type of definedWithoutEditor(definitions)) {
      devWarn(
        `the block type "${type}" has a definition of its own whose preview replaces the one that edits it, so an ` +
          `editable canvas draws ${type} blocks nobody can write in. Quoin edits ${type} in its preview rather than ` +
          `in an editor: give your definition an editor of its own, or keep Quoin's and draw yours only where the ` +
          `canvas is read-only.`,
      );
    }
  }, [definitions, readOnly]);
}
