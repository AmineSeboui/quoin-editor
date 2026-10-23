import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorState } from '../../engine';
import { createAnnouncer } from './announcer';

const stateOf = (name: string) => ({ name }) as unknown as EditorState;

describe('createAnnouncer', () => {
  it('has said nothing until it is asked to', () => {
    expect(createAnnouncer(() => stateOf('a')).current()).toBeNull();
  });

  it('keeps a message with the state it was made in and tells its listeners', () => {
    let state = stateOf('first');
    const announcer = createAnnouncer(() => state);
    const listener = vi.fn();
    announcer.subscribe(listener);
    announcer.announce('checked');
    expect(announcer.current()).toMatchObject({ message: 'checked', state });
    expect(listener).toHaveBeenCalledTimes(1);
    const first = state;
    state = stateOf('second');
    announcer.announce('checked');
    expect(announcer.current()?.state).toBe(state);
    expect(announcer.current()?.state).not.toBe(first);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('offers what it said only while the state it was said in is the current one', () => {
    let state = stateOf('first');
    const announcer = createAnnouncer(() => state);
    announcer.announce('checked');
    state = stateOf('second');
    expect(announcer.current()).toBeNull();
  });

  it('stops telling a listener that unsubscribed, even from inside a notification', () => {
    const announcer = createAnnouncer(() => stateOf('a'));
    const calls: string[] = [];
    const stopFirst = announcer.subscribe(() => {
      calls.push('first');
      stopFirst();
    });
    announcer.subscribe(() => calls.push('second'));
    announcer.announce('one');
    announcer.announce('two');
    expect(calls).toEqual(['first', 'second', 'second']);
  });
});

describe('the throttle of createAnnouncer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('says the same words in the same state once within half a second, and again after it', () => {
    const state = stateOf('a');
    const announcer = createAnnouncer(() => state);
    const listener = vi.fn();
    announcer.subscribe(listener);
    announcer.announce('Copied');
    vi.advanceTimersByTime(499);
    announcer.announce('Copied');
    expect(listener).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    announcer.announce('Copied');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('says other words at once, in the same state', () => {
    const state = stateOf('a');
    const announcer = createAnnouncer(() => state);
    announcer.announce('Copied');
    announcer.announce('Block deleted');
    expect(announcer.current()?.message).toBe('Block deleted');
  });

  it('says the same words again at once when the state has moved on', () => {
    let state = stateOf('first');
    const announcer = createAnnouncer(() => state);
    announcer.announce('1 block selected');
    const first = announcer.current();
    state = stateOf('second');
    announcer.announce('1 block selected');
    expect(announcer.current()).not.toBe(first);
    expect(announcer.current()?.state).toBe(state);
  });

  it('takes the length of its window from the caller', () => {
    const state = stateOf('a');
    const announcer = createAnnouncer(() => state, 100);
    announcer.announce('Copied');
    const first = announcer.current();
    vi.advanceTimersByTime(100);
    announcer.announce('Copied');
    expect(announcer.current()).not.toBe(first);
  });

  it('numbers each announcement, so two of the same words can be told apart', () => {
    const state = stateOf('a');
    const announcer = createAnnouncer(() => state);
    announcer.announce('Copied');
    const first = announcer.current()!.serial;
    vi.advanceTimersByTime(500);
    announcer.announce('Copied');
    expect(announcer.current()!.serial).toBeGreaterThan(first);
  });
});
