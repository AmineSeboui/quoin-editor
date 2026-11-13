import { isDropped, isElement, TEXT_NODE } from './html-dom';
import { isMsoIgnored } from './html-inline';
import { parseStyle } from './html-styles';

const LENGTH = /(\d*\.?\d+)(px|pt)/;
const MEDIUM_PX = 16;
const LEVELS: readonly (readonly [ratio: number, level: number])[] = [
  [1.8, 1],
  [1.4, 2],
  [1.15, 3],
];

export type SizedHeading = (paragraph: Element) => number | null;

function declaredSize(element: Element): number | null {
  const styles = parseStyle(element.getAttribute('style'));
  const length = LENGTH.exec(styles.get('font-size') ?? styles.get('font') ?? '');
  return length && Number(length[1]) * (length[2] === 'pt' ? 4 / 3 : 1);
}

function sizeOf(element: Element, known: Map<Element, number>): number {
  const chain: Element[] = [];
  let size: number | null | undefined;
  for (let at: Element | null = element; at !== null && size == null; at = at.parentElement) {
    chain.push(at);
    size = known.get(at) ?? declaredSize(at);
  }
  const resolved = size ?? MEDIUM_PX;
  for (const at of chain) known.set(at, resolved);
  return resolved;
}

function eachText(root: Element, visit: (text: string, parent: Element) => void): void {
  const pending: Node[] = [root];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.nodeType === TEXT_NODE) visit(node.nodeValue ?? '', node.parentElement ?? root);
    else if (isElement(node) && !isDropped(node) && !isMsoIgnored(node)) {
      for (let part = node.lastChild; part !== null; part = part.previousSibling) pending.push(part);
    }
  }
}

function bodySize(body: Element, known: Map<Element, number>): number {
  const weights = new Map<number, number>([[MEDIUM_PX, 0]]);
  eachText(body, (text, parent) => {
    const weight = text.replace(/\s/g, '').length;
    if (weight === 0) return;
    const size = sizeOf(parent, known);
    weights.set(size, (weights.get(size) ?? 0) + weight);
  });
  return [...weights].reduce((most, entry) => (entry[1] > most[1] ? entry : most))[0];
}

/**
 * The heading level of a paragraph written as a styled run, from how much larger its smallest text is than the size
 * most of the paste is written in. Text with no size of its own reads at the browser's 16 px.
 */
export function sizedHeading(root: Element): SizedHeading {
  const known = new Map<Element, number>();
  let base: number | undefined;
  return (paragraph) => {
    let least = Infinity;
    eachText(paragraph, (text, parent) => {
      if (/\S/.test(text)) least = Math.min(least, sizeOf(parent, known));
    });
    if (least === Infinity) return null;
    const body = (base ??= bodySize(root, known));
    return LEVELS.find(([ratio]) => least >= body * ratio)?.[1] ?? null;
  };
}
