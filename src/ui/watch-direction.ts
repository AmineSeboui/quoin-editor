import { inlineDirection, type InlineDirection } from './direction';

const TURNS_ROUND: MutationObserverInit = { attributeFilter: ['dir', 'class', 'style'] };

/**
 * Calls `onChange` with the direction `element` is laid out in each time a `dir` attribute, a class or an inline style
 * on it or on an element around it turns it round. Returns what stops watching.
 */
export function watchDirection(element: Element, onChange: (direction: InlineDirection) => void): () => void {
  let current = inlineDirection(element);
  const observer = new MutationObserver(() => {
    const next = inlineDirection(element);
    if (next === current) return;
    current = next;
    onChange(next);
  });
  for (let node: Element | null = element; node !== null; node = node.parentElement) observer.observe(node, TURNS_ROUND);
  return () => observer.disconnect();
}
