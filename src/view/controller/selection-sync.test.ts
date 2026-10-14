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

  it('still reports a change made after the suppressed write when the browser folds both into one event', () => {
    const onChange = vi.fn();
    const sync = createSelectionSync(document, onChange);
    const text = document.body.appendChild(document.createTextNode('hello'));
    const selection = document.getSelection()!;
    const fire = () => document.dispatchEvent(new Event('selectionchange'));
    sync.start();
    try {
      selection.collapse(text, 1);
      sync.suppressNext();
      fire();
      expect(onChange).not.toHaveBeenCalled();
      selection.collapse(text, 2);
      sync.suppressNext();
      selection.collapse(text, 3);
      fire();
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      sync.stop();
      text.remove();
    }
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
