import type { BlockSpec } from '../schema/types';
import { bookmarkSpec } from './bookmark-spec';
import { calloutSpec } from './callout-spec';
import { codeSpec } from './code-spec';
import { dividerSpec } from './divider-spec';
import { embedSpec } from './embed-spec';
import { fileSpec } from './file-spec';
import { imageSpec } from './image-spec';
import { markdownSpec } from './markdown-spec';
import { mathSpec } from './math-spec';
import { tableSpec } from './table-spec';
import { tocSpec } from './toc-spec';
import { toggleSpec } from './toggle-spec';

export const coreBlockSpecs: BlockSpec[] = [
  markdownSpec,
  calloutSpec,
  codeSpec,
  imageSpec,
  fileSpec,
  dividerSpec,
  toggleSpec,
  tableSpec,
  embedSpec,
  bookmarkSpec,
  mathSpec,
  tocSpec,
];
