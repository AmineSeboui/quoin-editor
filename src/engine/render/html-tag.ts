import { escapeAttr } from './escape-html';

export type Attr = readonly [name: string, value: string | true | undefined];

const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9_.:-]*$/;

export function openTag(name: string, attrs: readonly Attr[] = []): string {
  const written = attrs
    .filter(([key, value]) => value !== undefined && ATTRIBUTE_NAME.test(key))
    .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${escapeAttr(value as string)}"`))
    .join('');
  return `<${name}${written}>`;
}

export function element(name: string, attrs: readonly Attr[], inner: string): string {
  return `${openTag(name, attrs)}${inner}</${name}>`;
}
