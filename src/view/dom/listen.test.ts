import { listen } from './listen';

describe('listen', () => {
  it('adds each handler for its type and removes exactly those again', () => {
    const target = new EventTarget();
    const seen: string[] = [];
    const stop = listen(target, { a: () => seen.push('a'), b: (event: Event) => seen.push(event.type) });
    target.dispatchEvent(new Event('a'));
    target.dispatchEvent(new Event('b'));
    stop();
    target.dispatchEvent(new Event('a'));
    target.dispatchEvent(new Event('b'));
    expect(seen).toEqual(['a', 'b']);
  });

  it('listens in the capture phase when asked, and removes the captured handler', () => {
    const outer = document.createElement('div');
    const inner = outer.appendChild(document.createElement('span'));
    const order: string[] = [];
    const stopCapture = listen(outer, { click: () => order.push('outer') }, true);
    const stopInner = listen(inner, { click: () => order.push('inner') });
    inner.click();
    stopCapture();
    inner.click();
    stopInner();
    inner.click();
    expect(order).toEqual(['outer', 'inner', 'inner']);
  });
});
