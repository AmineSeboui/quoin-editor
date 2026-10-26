type Handlers = Readonly<Record<string, (event: never) => void>>;

/** Adds each handler for its event type to `target`, and returns what removes them again, in the same order. */
export function listen(target: EventTarget, handlers: Handlers, capture?: boolean): () => void {
  const entries = Object.entries(handlers) as [string, EventListener][];
  for (const [type, handler] of entries) target.addEventListener(type, handler, capture);
  return () => {
    for (const [type, handler] of entries) target.removeEventListener(type, handler, capture);
  };
}
