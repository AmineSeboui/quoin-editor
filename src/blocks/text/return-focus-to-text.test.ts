import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViewController } from '../../view';
import { returnFocusToText } from './return-focus-to-text';

function closeMenu() {
  const root = document.createElement('div');
  const host = document.createElement('div');
  host.tabIndex = -1;
  const trigger = document.createElement('button');
  trigger.tabIndex = -1;
  root.append(host, trigger);
  const outside = document.createElement('button');
  document.body.append(root, outside);
  const focus = vi.fn();
  const isEditorElement = (element: Element) => element === host;
  const close = returnFocusToText({ root, focus, isEditorElement } as unknown as ViewController);
  const event = new Event('focusScope.autoFocusOnUnmount', { cancelable: true });
  return { host, trigger, outside, focus, run: () => close(event), event };
}

afterEach(() => document.body.replaceChildren());

describe('returnFocusToText', () => {
  it('puts the caret back when the closed menu took focus with it', () => {
    const { focus, run, event } = closeMenu();
    run();
    expect(event.defaultPrevented).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('leaves focus in the text a press outside the menu moved it to', () => {
    const { host, focus, run, event } = closeMenu();
    host.focus();
    run();
    expect(event.defaultPrevented).toBe(true);
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(host);
  });

  it('puts the caret back when a press left focus on a control inside the editor, such as the menu trigger', () => {
    const { trigger, focus, run } = closeMenu();
    trigger.focus();
    run();
    expect(focus).toHaveBeenCalledOnce();
  });

  it('leaves focus on a control outside the editor a press moved it to', () => {
    const { outside, focus, run } = closeMenu();
    outside.focus();
    run();
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside);
  });
});
