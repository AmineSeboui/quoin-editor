import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

/**
 * Escape for a Radix layer whose own buttons show tooltips. A tooltip open on the focused button is the top layer, so
 * the layer's Escape handler never hears the key. Escape pressed on the layer's own content is taken by the content in
 * the capture phase instead, where the layer's handler would have taken it, and the layer's handler keeps only Escape
 * pressed elsewhere, which `outside` takes.
 */
export function escapeWithin(
  content: RefObject<HTMLElement | null>,
  onEscape: (event: ReactKeyboardEvent) => void,
  outside?: (event: KeyboardEvent) => void,
) {
  const within = (target: EventTarget | null) => content.current?.contains(target as Node) ?? false;
  return {
    onKeyDownCapture(event: ReactKeyboardEvent) {
      if (event.key !== 'Escape' || event.nativeEvent.isComposing || !within(event.target)) return;
      event.preventDefault();
      onEscape(event);
    },
    onEscapeKeyDown(event: KeyboardEvent) {
      if (within(event.target)) event.preventDefault();
      else outside?.(event);
    },
  };
}
