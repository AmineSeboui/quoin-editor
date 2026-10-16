import { defaultRenderers, type BlockRenderer } from '../view';

export const canvasRenderers: Readonly<Record<string, BlockRenderer>> = defaultRenderers;
