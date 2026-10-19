import type { BlockRenderer } from '../view';
import { CodeBlock } from './code/CodeBlock';

/**
 * The void blocks the canvas draws itself and edits in place, for Quoin's own definition of their type. Unlike its text
 * blocks, it draws them only while a definition of the type is registered.
 */
export const inPlaceRenderers: Readonly<Record<'CODE', BlockRenderer>> = {
  CODE: CodeBlock,
};
