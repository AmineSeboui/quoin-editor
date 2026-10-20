'use client';

import type { BlockRenderer } from '../../view';
import { focusNode } from '../void/select-node';

export const DividerBlock: BlockRenderer = ({ block, controller }) => (
  <div className="py-2" contentEditable={false} onClick={() => focusNode(controller, block.id)}>
    <hr className="border-t border-border" />
  </div>
);
