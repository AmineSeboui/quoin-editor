'use client';

import { useEffect } from 'react';
import { definedTypedInPlace } from '../blocks/block-drawing';
import { devWarn } from '../dev-warn';
import type { AnyBlockDefinition } from '../registry';

export function useTypedInPlaceWarning(definitions: readonly AnyBlockDefinition[], readOnly: boolean): void {
  useEffect(() => {
    if (readOnly) return;
    for (const type of definedTypedInPlace(definitions)) {
      devWarn(
        `the block type "${type}" has a definition of its own, which only a read-only canvas draws. ` +
          `An editable canvas keeps drawing ${type} blocks itself, since they are typed into in place.`,
      );
    }
  }, [definitions, readOnly]);
}
