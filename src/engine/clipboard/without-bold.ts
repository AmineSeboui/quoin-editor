import { inlineLength, removeMarkRange } from '../model/inline';
import type { Inline } from '../model/types';

/** Text of a heading or a header row, whose bold is how it is drawn rather than a mark of its own. */
export const withoutBold = (inline: Inline): Inline => removeMarkRange(inline, 0, inlineLength(inline), 'bold');
