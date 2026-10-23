import { alignOrUndefined } from '../engine/blocks/data-fields';
import { xmlElement } from './xml';

export type ParagraphProps = {
  readonly style?: string;
  readonly numId?: number;
  readonly level?: number;
  readonly border?: boolean;
  readonly shade?: string;
  readonly indent?: number;
  readonly hanging?: number;
  readonly align?: unknown;
};

export const INDENT_STEP = 720;

const JUSTIFY: Readonly<Record<string, string>> = { left: 'left', center: 'center', right: 'right', justify: 'both' };

const BOTTOM_BORDER = xmlElement(
  'w:pBdr',
  {},
  xmlElement('w:bottom', { 'w:val': 'single', 'w:sz': 6, 'w:space': 1, 'w:color': 'auto' }),
);

function numberingXml({ numId, level }: ParagraphProps): string {
  if (numId === undefined) return '';
  return xmlElement('w:numPr', {}, xmlElement('w:ilvl', { 'w:val': level ?? 0 }) + xmlElement('w:numId', { 'w:val': numId }));
}

/** The paragraph properties as Word reads them, in the order its schema sets. */
function paragraphPropsXml(props: ParagraphProps): string {
  const align = alignOrUndefined(props.align);
  const indented = (props.indent ?? 0) > 0 || props.hanging !== undefined;
  const inner = [
    props.style === undefined ? '' : xmlElement('w:pStyle', { 'w:val': props.style }),
    numberingXml(props),
    props.border ? BOTTOM_BORDER : '',
    props.shade === undefined ? '' : xmlElement('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': props.shade }),
    indented ? xmlElement('w:ind', { 'w:left': props.indent ?? 0, 'w:hanging': props.hanging }) : '',
    align === undefined ? '' : xmlElement('w:jc', { 'w:val': JUSTIFY[align] }),
  ].join('');
  return inner === '' ? '' : xmlElement('w:pPr', {}, inner);
}

/** A paragraph of runs already written. */
export const paragraphXml = (props: ParagraphProps, runs: string): string =>
  xmlElement('w:p', {}, paragraphPropsXml(props) + runs);

/** The left indent of a block nested `indent` deep. */
export const indentOf = (indent: number): number => indent * INDENT_STEP;
