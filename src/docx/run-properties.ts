import type { Mark } from '../engine/model/types';
import { backgroundHex, textHex } from './palette-hex';
import { CODE_CHAR_STYLE } from './style-ids';
import { xmlElement } from './xml';

export type RunProps = {
  readonly style?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly strike?: boolean;
  readonly color?: string;
  readonly underline?: boolean;
  readonly shade?: string;
  readonly vertAlign?: 'subscript' | 'superscript';
};

const HIGHLIGHT = 'yellow';

function markProps(mark: Mark): RunProps {
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
      return { vertAlign: 'subscript' };
    case 'sup':
      return { vertAlign: 'superscript' };
    case 'code':
      return { style: CODE_CHAR_STYLE };
    case 'highlight':
      return { shade: backgroundHex(color || HIGHLIGHT) };
    case 'color':
      return { color: textHex(color) };
    case 'background':
      return { shade: backgroundHex(color) };
    default:
      return {};
  }
}

const defined = (props: RunProps) => Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

/** The run properties of `marks` over `base`; a link adds its style unless a mark already set one. */
export function propsOf(marks: readonly Mark[], base: RunProps, linked: boolean): RunProps {
  const props: RunProps = marks.reduce<RunProps>((all, mark) => ({ ...all, ...defined(markProps(mark)) }), base);
  return linked && props.style === undefined ? { ...props, style: 'Hyperlink' } : props;
}

const on = (flag: boolean | undefined, name: string) => (flag ? xmlElement(name) : '');

/** The run properties as Word reads them, in the order its schema sets. */
export function runPropertiesXml(props: RunProps): string {
  const inner = [
    props.style === undefined ? '' : xmlElement('w:rStyle', { 'w:val': props.style }),
    on(props.bold, 'w:b'),
    on(props.italic, 'w:i'),
    on(props.strike, 'w:strike'),
    props.color === undefined ? '' : xmlElement('w:color', { 'w:val': props.color }),
    props.underline ? xmlElement('w:u', { 'w:val': 'single' }) : '',
    props.shade === undefined ? '' : xmlElement('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': props.shade }),
    props.vertAlign === undefined ? '' : xmlElement('w:vertAlign', { 'w:val': props.vertAlign }),
  ].join('');
  return inner === '' ? '' : xmlElement('w:rPr', {}, inner);
}
