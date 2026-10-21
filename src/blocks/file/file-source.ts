import type { BlockAttrs } from '../../engine';
import { str } from '../str';

/** The name of the file a file block holds, or its key when the upload kept no name. */
export const fileName = (attrs: BlockAttrs): string => str(attrs.filename) || str(attrs.storageKey);

/** Whether a file block holds a file, which it draws as a card rather than as an upload button. */
export const hasFile = (attrs: BlockAttrs): boolean => fileName(attrs) !== '';
