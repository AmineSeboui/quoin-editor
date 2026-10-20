import { createContext, useCallback, useContext } from 'react';

export const BlockDomIdScope = createContext('quoin');

// Scoped to the editor, so two editors showing one document never share an id, and encoded, so that a block id with a
// space in it still reads as one id in an aria-controls list.
export function useBlockDomId(): (block: string) => string {
  const scope = useContext(BlockDomIdScope);
  return useCallback((block: string) => `${scope}-${encodeURIComponent(block)}`, [scope]);
}

/** The id of the host of a block's region, which can never be the id of a block: an encoded block id has no slash. */
export function useRegionDomId(block: string, region: string): string {
  return `${useBlockDomId()(block)}/${encodeURIComponent(region)}`;
}
