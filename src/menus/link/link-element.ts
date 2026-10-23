import type { EditorState } from '../../engine';
import type { MarkRange } from '../../engine/commands/selection-marks';
import { domMapOf, type ViewController } from '../../view';
import { linkAround, type LinkAtSelection } from './link-at-selection';

const LINK = 'a[data-quoin-link]';

/** The drawn link an event target is in, when it is in one of the controller's text hosts. */
export function linkElementAt(controller: ViewController, target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>(LINK) : null;
  return link !== null && controller.registry.locate(link) !== null ? link : null;
}

/** The link of the document a drawn link stands for, or null once the element is gone from its host. */
export function linkAtElement(controller: ViewController, state: EditorState, element: Element): LinkAtSelection | null {
  const host = controller.registry.locate(element);
  const offset = host === null ? null : (domMapOf(host.element)?.fromDom(element, 0) ?? null);
  if (host === null || offset === null) return null;
  return linkAround(state, { block: host.block, region: host.region, offset });
}

const sameStart = (a: MarkRange, b: MarkRange) => a.block === b.block && a.region === b.region && a.from === b.from;

/**
 * Whether two drawn links stand for the same link of the document. A link whose text carries other marks in places
 * is drawn as several elements.
 */
export function sameLink(controller: ViewController, a: Element | null, b: Element | null): boolean {
  if (a === b || a === null || b === null) return a === b;
  const { state } = controller.editor;
  const first = linkAtElement(controller, state, a)?.range;
  const second = linkAtElement(controller, state, b)?.range;
  return first !== undefined && second !== undefined && sameStart(first, second);
}
