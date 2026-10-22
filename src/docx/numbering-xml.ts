import type { ListNumbering } from './docx-context';
import { INDENT_STEP } from './paragraph-xml';
import { XML_DECLARATION, xmlElement } from './xml';

const LEVELS = 9;
const BULLETS = ['\u2022', '\u25E6', '\u25AA'];
const ORDERED_FORMATS = ['decimal', 'lowerLetter', 'lowerRoman'];
const HANG = 360;

const BULLET = 0;
const ORDERED = 1;

function levelXml(level: number, ordered: boolean): string {
  const format = ordered ? ORDERED_FORMATS[level % 3] : 'bullet';
  const text = ordered ? `%${level + 1}.` : BULLETS[level % 3];
  return xmlElement(
    'w:lvl',
    { 'w:ilvl': level },
    xmlElement('w:start', { 'w:val': 1 }) +
      xmlElement('w:numFmt', { 'w:val': format }) +
      xmlElement('w:lvlText', { 'w:val': text }) +
      xmlElement('w:lvlJc', { 'w:val': 'left' }) +
      xmlElement('w:pPr', {}, xmlElement('w:ind', { 'w:left': (level + 1) * INDENT_STEP, 'w:hanging': HANG })),
  );
}

const abstractXml = (id: number, ordered: boolean) =>
  xmlElement(
    'w:abstractNum',
    { 'w:abstractNumId': id },
    xmlElement('w:multiLevelType', { 'w:val': 'hybridMultilevel' }) +
      Array.from({ length: LEVELS }, (_, level) => levelXml(level, ordered)).join(''),
  );

// A num that points at an abstract numbering already used carries on its count unless a level starts over.
function numXml({ numId, ordered, level, start }: ListNumbering): string {
  const restart = ordered
    ? xmlElement('w:lvlOverride', { 'w:ilvl': level }, xmlElement('w:startOverride', { 'w:val': start }))
    : '';
  const scheme = xmlElement('w:abstractNumId', { 'w:val': ordered ? ORDERED : BULLET });
  return xmlElement('w:num', { 'w:numId': numId }, scheme + restart);
}

/** The numbering part: one bullet and one ordered scheme of nine levels, and a numbering for each list. */
export const numberingXml = (lists: readonly ListNumbering[]): string =>
  XML_DECLARATION +
  xmlElement(
    'w:numbering',
    { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' },
    abstractXml(BULLET, false) + abstractXml(ORDERED, true) + lists.map(numXml).join(''),
  );
