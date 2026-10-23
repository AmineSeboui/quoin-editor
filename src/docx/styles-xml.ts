import { CODE_CHAR_STYLE, CODE_STYLE } from './style-ids';
import { XML_DECLARATION, xmlElement } from './xml';

const MONO = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
const HEADING_SIZES = [36, 30, 26, 24, 22, 22];

type Style = { type: string; id: string; name: string; basedOn?: string; pPr?: string; rPr?: string; tblPr?: string };

function styleXml({ type, id, name, basedOn, pPr, rPr, tblPr }: Style): string {
  return xmlElement(
    'w:style',
    { 'w:type': type, 'w:styleId': id, 'w:default': id === 'Normal' ? 1 : undefined },
    xmlElement('w:name', { 'w:val': name }) +
      (basedOn ? xmlElement('w:basedOn', { 'w:val': basedOn }) : '') +
      (type === 'paragraph' ? xmlElement('w:next', { 'w:val': 'Normal' }) : '') +
      (pPr ? xmlElement('w:pPr', {}, pPr) : '') +
      (rPr ? xmlElement('w:rPr', {}, rPr) : '') +
      (tblPr ? xmlElement('w:tblPr', {}, tblPr) : ''),
  );
}

const headings: Style[] = HEADING_SIZES.map((size, at) => ({
  type: 'paragraph',
  id: `Heading${at + 1}`,
  name: `heading ${at + 1}`,
  basedOn: 'Normal',
  pPr: `<w:keepNext/><w:spacing w:before="${at < 2 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${at}"/>`,
  rPr: `<w:b/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
}));

const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`;

const STYLES: Style[] = [
  { type: 'paragraph', id: 'Normal', name: 'Normal', pPr: '<w:spacing w:after="120" w:line="276" w:lineRule="auto"/>' },
  ...headings,
  {
    type: 'paragraph',
    id: 'Quote',
    name: 'Quote',
    basedOn: 'Normal',
    pPr: '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BFBFBF"/></w:pBdr><w:ind w:left="240"/>',
    rPr: '<w:i/><w:color w:val="595959"/>',
  },
  {
    type: 'paragraph',
    id: CODE_STYLE,
    name: 'Code',
    basedOn: 'Normal',
    pPr: '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/><w:spacing w:after="120" w:line="240" w:lineRule="auto"/>',
    rPr: `${MONO}<w:sz w:val="20"/>`,
  },
  {
    type: 'paragraph',
    id: 'Caption',
    name: 'caption',
    basedOn: 'Normal',
    rPr: '<w:i/><w:color w:val="595959"/><w:sz w:val="18"/>',
  },
  {
    type: 'character',
    id: CODE_CHAR_STYLE,
    name: 'Code Char',
    rPr: `${MONO}<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>`,
  },
  { type: 'character', id: 'Hyperlink', name: 'Hyperlink', rPr: '<w:color w:val="0A71B1"/><w:u w:val="single"/>' },
  {
    type: 'table',
    id: 'TableGrid',
    name: 'Table Grid',
    tblPr: `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders>`,
  },
];

const DEFAULTS =
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>' +
  '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>';

/** The styles part: the paragraph, character and table styles the body names. */
export const stylesXml = (): string =>
  XML_DECLARATION +
  xmlElement(
    'w:styles',
    { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' },
    DEFAULTS + STYLES.map(styleXml).join(''),
  );
