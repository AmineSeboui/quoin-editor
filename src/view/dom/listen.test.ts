import { listen } from './listen';

describe('listen', () => {
  it('adds each handler for its type and removes exactly those again', () => {
    const target = new EventTarget();
    const seen: string[] = [];
    const stop = listen(target, { focus: () => seen.push('focus'), blur: (event: FocusEvent) => seen.push(event.type) });
    target.dispatchEvent(new Event('focus'));
    target.dispatchEvent(new Event('blur'));
    stop();
    target.dispatchEvent(new Event('focus'));
    target.dispatchEvent(new Event('blur'));
    expect(seen).toEqual(['focus', 'blur']);
  });

  it('takes for each type only a handler of that type of event', () => {
    const target = new EventTarget();
    const stops = [
      listen(target, { keydown: (event: KeyboardEvent) => void event.key, loadingdone: (event: FontFaceSetLoadEvent) => void event }),
      // @ts-expect-error a pointer handler given for a key event
      listen(target, { keydown: (event: PointerEvent) => void event.pointerId }),
      // @ts-expect-error a type no target here sends
      listen(target, { keydwn: () => {} }),
    ];
    for (const stop of stops) stop();
    expect(stops).toHaveLength(3);
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
