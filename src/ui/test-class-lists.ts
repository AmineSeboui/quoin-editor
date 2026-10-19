/** The elements Quoin styles through `cn`, besides the primitives, which carry a `data-slot`. */
export const STYLED = [
  '[data-slot]',
  '.quoin-editor',
  '.quoin-callout',
  'div[role="heading"]',
  '[role="option"]',
  '[data-slot="dialog-content"] > button',
].join(', ');

/** The classes of an element as a sorted set, since neither their order in the attribute nor a repeat changes which
 *  rules match. */
export const classSet = (element: Element): string =>
  [...new Set((element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean))].sort().join(' ');

const labelOf = (element: Element): string => {
  const slot = element.getAttribute('data-slot');
  const text = element.getAttribute('aria-label') ?? element.textContent ?? '';
  const name = text.replace(/[^\x20-\x7e]/g, '').trim().slice(0, 32);
  return `${element.tagName.toLowerCase()}${slot === null ? '' : `[${slot}]`} ${name}`.trim();
};

/** Every styled element in `scopes`, the scopes included, named and with its class set, in document order. */
export function classLists(...scopes: Element[]): string[] {
  return scopes.flatMap((scope) =>
    [scope, ...scope.querySelectorAll(STYLED)]
      .filter((element) => element.matches(STYLED))
      .map((element) => `${labelOf(element)}: ${classSet(element)}`),
  );
}
