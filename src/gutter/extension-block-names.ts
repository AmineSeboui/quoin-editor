import { createContext } from 'react';

/** The names the extensions of the canvas give the block types they draw, which head a block's menu. */
export const ExtensionBlockNames = createContext<Readonly<Record<string, string>>>({});
