import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSelectionSync } from './selection-sync';

function setup() {
  const doc = document.implementation.createHTMLDocument();
  const onChange = vi.fn();
  const sync = createSelectionSync(doc, onChange);
  const fire = () => doc.dispatchEvent(new Event('selectionchange'));
  return { sync, onChange, fire };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('selection sync', () => {
  it('reports selection changes between start and stop', () => {
    const { sync, onChange, fire } = setup();
    fire();
    sync.start();
    fire();
    sync.stop();
    fire();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('suppresses exactly one event', () => {
    const { sync, onChange, fire } = setup();
    sync.start();
    sync.suppressNext();
    sync.suppressNext();
    fire();
    fire();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('drops an unused suppression on the next macrotask', () => {
    vi.useFakeTimers();
    const { sync, onChange, fire } = setup();
    sync.start();
    sync.suppressNext();
    vi.advanceTimersByTime(0);
    fire();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
