import { createCanvasUiStore } from './ui-store';

describe('createCanvasUiStore', () => {
  it('starts with nothing hovered, open or dragged', () => {
    expect(createCanvasUiStore().get()).toEqual({
      hoveredBlock: null,
      blockMenu: null,
      drag: null,
      linkPopover: { open: false },
      slashOpen: false,
    });
  });

  it('merges a patch and tells its listeners, but only when a value changed', () => {
    const store = createCanvasUiStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ hoveredBlock: 'a' });
    store.set({ hoveredBlock: 'a' });
    expect(store.get().hoveredBlock).toBe('a');
    expect(store.get().slashOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set({ hoveredBlock: 'b' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
