'use client';

import type { BlockRenderer } from '../../view';
import { selectNode } from '../void/select-node';

export const DividerBlock: BlockRenderer = ({ block, controller }) => (
  <div
    className="py-2"
    contentEditable={false}
    onClick={() => {
      selectNode(controller, block.id);
      controller.focus();
    }}
  >
    <hr className="border-t border-border" />
  </div>
);
