import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchDirection } from './watch-direction';

const settled = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => document.body.replaceChildren());

describe('watchDirection', () => {
  it('reports each turn the element around it makes, and nothing for a change that leaves the direction', async () => {
    const wrapper = document.createElement('div');
    const element = document.createElement('div');
    wrapper.append(element);
    document.body.append(wrapper);
    const onChange = vi.fn();
    const stop = watchDirection(element, onChange);
    wrapper.className = 'unrelated';
    await settled();
    wrapper.dir = 'rtl';
    await settled();
    wrapper.style.direction = 'ltr';
    await settled();
    expect(onChange.mock.calls).toEqual([['rtl'], ['ltr']]);
    stop();
    wrapper.style.direction = 'rtl';
    await settled();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
