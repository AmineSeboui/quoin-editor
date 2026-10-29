import type { Attrs } from '../../engine';

export function withoutEventHandlers(attrs: Attrs): Attrs {
  return Object.fromEntries(Object.entries(attrs).filter(([name]) => !/^on/i.test(name)));
}
