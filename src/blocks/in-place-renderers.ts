import type { ComponentType } from 'react';
import type { BlockRenderer, ViewController } from '../view';
import { CodeBlock } from './code/CodeBlock';
import { ImageBlock } from './image/ImageBlock';
import { ImageToolbarOverlay } from './image/ImageToolbar';

/**
 * The void blocks the canvas draws itself and edits in place, for Quoin's own definition of their type. Unlike its text
 * blocks, it draws them only while a definition of the type is registered.
 */
export const inPlaceRenderers: Readonly<Record<'CODE' | 'IMAGE', BlockRenderer>> = {
  CODE: CodeBlock,
  IMAGE: ImageBlock,
};

/** The overlays a block edited in place draws over the canvas, such as the toolbar of a selected image. */
export const inPlaceOverlays: Readonly<Record<'IMAGE', ComponentType<{ controller: ViewController }>>> = {
  IMAGE: ImageToolbarOverlay,
};
