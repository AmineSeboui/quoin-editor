import type { ComponentType } from 'react';
import type { EngineBlock } from '../../engine';
import type { ViewController } from '../controller/view-controller';

export type BlockRenderProps = { block: EngineBlock; controller: ViewController; index: number };
export type BlockRenderer = ComponentType<BlockRenderProps>;
