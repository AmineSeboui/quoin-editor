import type { Attrs } from '../../engine';
import { dataAttributes } from '../../engine/markdown/inline/html-marks';
import { writtenAttrs } from '../../engine/render/html-node';

export const sortedEntries = (attrs: Attrs | undefined): [string, string][] => dataAttributes(attrs, '');

// Attribute names come from document data, and setAttribute throws on a name the DOM rejects.
export function setAttributes(element: Element, attrs: Attrs | undefined, prefix = ''): void {
  for (const [name, value] of writtenAttrs(dataAttributes(attrs, prefix))) element.setAttribute(name, value as string);
}
