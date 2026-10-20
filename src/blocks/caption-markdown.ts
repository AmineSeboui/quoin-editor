import { parseInline, serializeInline } from '../engine';
import { inlineText, text } from '../engine/model/inline';

/** The text an image caption reads as. The caption is stored as inline markdown, and the image editor's field is plain. */
export const captionText = (markdown: string): string => inlineText(parseInline(markdown), () => '');

/** The inline markdown that reads as exactly the text typed into the caption field. */
export const captionMarkdown = (plain: string): string => serializeInline(plain === '' ? [] : [text(plain)]);
