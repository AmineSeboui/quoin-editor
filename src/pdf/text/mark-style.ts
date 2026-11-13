import type { Mark } from '../../engine/model/types';
import { backgroundHex, textHex } from '../../export/palette-hex';
import { CODE_FILL, rgbOf, type TextStyle } from './text-style';

const HIGHLIGHT = 'yellow';

const colorOf = (hex: string | undefined) => (hex === undefined ? undefined : rgbOf(hex));

function markStyle(mark: Mark): Partial<TextStyle> {
  const color = mark.attrs?.color;
  switch (mark.type) {
    case 'bold':
      return { bold: true };
    case 'italic':
      return { italic: true };
    case 'underline':
      return { underline: true };
    case 'strike':
      return { strike: true };
    case 'sub':
      return { script: 'sub' };
    case 'sup':
      return { script: 'sup' };
    case 'code':
      return { mono: true, background: CODE_FILL };
    case 'highlight':
      return { background: colorOf(backgroundHex(color || HIGHLIGHT)) };
    case 'color':
      return { color: colorOf(textHex(color)) };
    case 'background':
      return { background: colorOf(backgroundHex(color)) };
    default:
      return {};
  }
}

const defined = (style: Partial<TextStyle>) => Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined));

/** The style of text under `marks`, over the style of its block. */
export const markedStyle = (marks: readonly Mark[], base: TextStyle): TextStyle =>
  marks.reduce<TextStyle>((style, mark) => ({ ...style, ...defined(markStyle(mark)) }), base);
