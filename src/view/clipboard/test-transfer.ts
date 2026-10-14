// jsdom has neither DataTransfer nor ClipboardEvent nor DragEvent, so the handlers are driven with these stand-ins.
export function fakeTransfer(initial: Record<string, string> = {}, files: File[] = []) {
  const store = new Map(Object.entries(initial));
  const transfer = {
    getData: (type: string) => store.get(type) ?? '',
    setData: (type: string, value: string) => void store.set(type, value),
    files,
    get types() {
      return [...store.keys(), ...(files.length > 0 ? ['Files'] : [])];
    },
  } as unknown as DataTransfer;
  return { transfer, store };
}

function withProperties<T extends Event>(type: string, properties: Record<string, unknown>): T {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries(properties)) Object.defineProperty(event, name, { value });
  return event as T;
}

export const clipboardEvent = (type: 'copy' | 'cut' | 'paste', transfer: DataTransfer): ClipboardEvent =>
  withProperties(type, { clipboardData: transfer });

export const dragEvent = (
  type: 'dragstart' | 'dragover' | 'drop',
  transfer: DataTransfer | null,
  x = 0,
  y = 0,
): DragEvent => withProperties(type, { dataTransfer: transfer, clientX: x, clientY: y });
