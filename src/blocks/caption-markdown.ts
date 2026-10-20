import { parseInline } from '../engine';
import { inlineText } from '../engine/model/inline';

/** The text an image caption reads as, from the inline markdown the block stores. */
export const captionText = (markdown: string): string => inlineText(parseInline(markdown), () => '');
