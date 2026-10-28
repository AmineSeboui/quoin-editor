import { createContext } from 'react';

export const BLOCK_ERROR = 'Block could not be drawn';

export type BlockErrorSettings = { label: string; report?: (error: Error) => void };

export const BlockErrorContext = createContext<BlockErrorSettings>({ label: BLOCK_ERROR });
