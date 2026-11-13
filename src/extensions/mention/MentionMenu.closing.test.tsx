import { act } from '@testing-library/react';
import { clipboardEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { ada, answered, openOn, optionTexts, waitForSearch } from './mention-test-canvas';

describe('the mention menu', () => {
  beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => void vi.useRealTimers());

  it('closes on Escape and leaves the @ and the query as text', async () => {
    const { canvas } = await answered([ada]);
    canvas.key('Escape');
    expect(canvas.menu()).toBeNull();
    expect(canvas.markdown('p')).toBe('Ask @ad');
    canvas.type('a');
    expect(canvas.menu()).toBeNull();
  });

  it('closes on a space right after the @, and asks nothing for the words after it', () => {
    const { canvas, search } = openOn('Ask');
    canvas.type(' @ ');
    expect(canvas.menu()).toBeNull();
    canvas.type('and more');
    waitForSearch();
    expect(canvas.menu()).toBeNull();
    expect(search).not.toHaveBeenCalled();
    expect(canvas.markdown('p')).toBe('Ask @ and more');
  });

  it('closes on pasted text that starts with a space right after the @', () => {
    const { canvas, search } = openOn('Ask');
    canvas.type(' @');
    expect(canvas.menu()).not.toBeNull();
    const { transfer } = fakeTransfer({ 'text/plain': ' and more' });
    act(() => void document.activeElement!.dispatchEvent(clipboardEvent('paste', transfer)));
    waitForSearch();
    expect(canvas.markdown('p')).toBe('Ask @ and more');
    expect(canvas.menu()).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });

  it('closes on a space once the host has found nothing, and stays open on one after results', async () => {
    const { canvas, last, queries } = openOn('Ask');
    canvas.type(' @zz');
    waitForSearch();
    await last().resolve([]);
    canvas.type(' ');
    expect(canvas.menu()).toBeNull();
    canvas.type('top');
    waitForSearch();
    expect(queries()).toEqual(['zz']);
    expect(canvas.markdown('p')).toBe('Ask @zz top');

    canvas.type(' @ada');
    waitForSearch();
    await last().resolve([ada]);
    canvas.type(' ');
    expect(optionTexts()).toEqual(['Ada']);
  });
});
