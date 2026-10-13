import type { Attrs } from '../../engine';

const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9_.:-]*$/;

export function sortedEntries(attrs: Attrs | undefined): [string, string][] {
  return Object.keys(attrs ?? {})
    .sort()
    .map((key) => [key, (attrs as Attrs)[key]]);
}

// Attribute names come from document data, and setAttribute throws on a name the DOM rejects.
export function setAttributes(element: Element, attrs: Attrs | undefined, prefix = ''): void {
  for (const [key, value] of sortedEntries(attrs)) {
    const name = prefix + key;
    if (ATTRIBUTE_NAME.test(name)) element.setAttribute(name, value);
  }
}
