import { describe, expect, it, vi } from 'vitest';
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
    expect(announcer.current()).toEqual({ message: 'checked', state });
    expect(listener).toHaveBeenCalledTimes(1);
    const first = state;
    state = stateOf('second');
    announcer.announce('checked');
    expect(announcer.current()?.state).toBe(state);
    expect(announcer.current()?.state).not.toBe(first);
    expect(listener).toHaveBeenCalledTimes(2);
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
