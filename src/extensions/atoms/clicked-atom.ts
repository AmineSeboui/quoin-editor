import { domMapOf, type ViewController } from '../../view';
import { atomPlaceAt, type AtomPlace } from './atom-place';

/** The atom of one of `types` an event landed on, found in the document through its line's map. */
export function clickedAtom(controller: ViewController, target: EventTarget | null, types: readonly string[]): AtomPlace | null {
  const element = (target as Element | null)?.closest?.('[data-quoin-atom]');
  if (!element) return null;
  const host = controller.registry.locate(element);
  const offset = host === null ? null : domMapOf(host.element)?.fromDom(element, 0);
  if (host === null || offset === null || offset === undefined) return null;
  return atomPlaceAt(controller.editor.state, { block: host.block, region: host.region, offset }, types);
}
