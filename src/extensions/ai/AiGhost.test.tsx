import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { mountAi } from './ai-test-canvas';

function improving() {
  const canvas = mountAi([paragraph('a', 'Say a word here'), paragraph('b', 'After')]);
  canvas.select('a', 4, 10);
  canvas.askAi();
  canvas.typeInField('improve');
  canvas.press('Enter');
  return canvas;
}

describe('an answer streaming into the document', () => {
  it('is drawn after its target, which shows as replaced, with Writing and Stop under it, focus on Stop', async () => {
    const canvas = improving();
    canvas.last().push('one **ter');
    await canvas.frame();
    const ghost = canvas.ghost()!;
    expect(canvas.host('a').contains(ghost)).toBe(false);
    expect(canvas.shell('a')).toHaveAttribute('data-quoin-ai-room');
    expect(ghost).toHaveAttribute('inert');
    expect(ghost.textContent).toBe('one ter');
    expect(ghost.querySelector('strong')?.textContent).toBe('ter');
    expect(canvas.host('a').querySelector('.quoin-ai-replaced')?.textContent).toBe('a word');
    expect(canvas.bar()).toHaveTextContent('Writing');
    expect(document.activeElement).toBe(canvas.button('Stop'));
    expect(canvas.markdown('a')).toBe('Say a word here');
    expect(canvas.handle().editor.toMarkdown()).not.toContain('one');
    expect(await act(() => axe(canvas.bar()!))).toHaveNoViolations();
    expect(await act(() => axe(canvas.container))).toHaveNoViolations();
  });

  it('stops on Stop, aborting the stream, and moves focus to Accept', async () => {
    const canvas = improving();
    canvas.last().push('one');
    await canvas.frame();
    canvas.click('Stop');
    expect(canvas.last().signal.aborted).toBe(true);
    expect(canvas.bar()).toHaveTextContent('Stopped');
    expect(document.activeElement).toBe(canvas.button('Accept'));
    const announced = canvas.container.querySelector('[aria-live="polite"]')?.textContent ?? '';
    expect(announced).toContain('Stopped');
    expect(announced).toContain('one');
  });

  it('is said once when it is complete, and Accept applies it in one undo step, focus back in the text', async () => {
    const canvas = improving();
    const announced = () => canvas.container.querySelector('[aria-live="polite"]')?.textContent ?? '';
    canvas.last().push('one ');
    await canvas.frame();
    expect(announced()).not.toContain('AI response ready');
    canvas.last().push('term');
    canvas.last().end();
    await canvas.frame();
    expect(announced()).toContain('AI response ready: one term');
    expect(document.activeElement).toBe(canvas.button('Accept'));
    canvas.click('Accept');
    expect(canvas.markdown('a')).toBe('Say one term here');
    expect(canvas.ghost()).toBeNull();
    expect(canvas.bar()).toBeNull();
    expect(document.activeElement).toBe(canvas.host('a'));
    canvas.undo();
    expect(canvas.markdown('a')).toBe('Say a word here');
  });

  it('shows a failed stream inline with Retry, reports it, and Retry asks again', async () => {
    const canvas = improving();
    canvas.last().fail(new Error('quota'));
    await canvas.frame();
    expect(screen.getByRole('alert')).toHaveTextContent('AI could not answer');
    expect(canvas.onError).toHaveBeenCalledWith(new Error('quota'));
    expect(await act(() => axe(canvas.bar()!))).toHaveNoViolations();
    canvas.click('Retry');
    expect(canvas.stream).toHaveBeenCalledTimes(2);
    expect(canvas.calls[1].request).toEqual(canvas.calls[0].request);
    expect(document.activeElement).toBe(canvas.button('Stop'));
  });

  it('is discarded by Discard, leaving the document as it was', async () => {
    const canvas = improving();
    canvas.last().push('one');
    canvas.last().end();
    await canvas.frame();
    canvas.click('Discard');
    expect(canvas.ghost()).toBeNull();
    expect(canvas.markdown('a')).toBe('Say a word here');
    expect(document.activeElement).toBe(canvas.host('a'));
  });

  it('asks a follow-up about itself, and the new answer replaces it', async () => {
    const canvas = improving();
    canvas.last().push('one term');
    canvas.last().end();
    await canvas.frame();
    const field = screen.getByRole('textbox', { name: 'Tell AI what to do next' });
    act(() => void fireEvent.change(field, { target: { value: 'shorter' } }));
    act(() => void fireEvent.submit(field.closest('form')!));
    expect(canvas.last().request).toMatchObject({ action: 'custom', prompt: 'shorter', selection: 'one term' });
    canvas.last().push('one');
    canvas.last().end();
    await canvas.frame();
    canvas.click('Accept');
    expect(canvas.markdown('a')).toBe('Say one here');
  });

  it('takes Escape from the text to its bar, and Escape there stops, then discards', async () => {
    const canvas = improving();
    canvas.last().push('one');
    await canvas.frame();
    canvas.caret('b', 1);
    expect(document.activeElement).toBe(canvas.host('b'));
    canvas.key('Escape');
    expect(document.activeElement).toBe(canvas.button('Stop'));
    canvas.press('Escape');
    expect(canvas.bar()).toHaveTextContent('Stopped');
    canvas.press('Escape');
    expect(canvas.ghost()).toBeNull();
    expect(canvas.markdown('a')).toBe('Say a word here');
  });

  it('leaves focus in the text when the stream ends while the writer is typing there', async () => {
    const canvas = improving();
    canvas.caret('b', 5);
    canvas.type('!');
    canvas.last().push('one');
    canvas.last().end();
    await canvas.frame();
    expect(document.activeElement).toBe(canvas.host('b'));
    expect(canvas.markdown('b')).toBe('After!');
  });

  it('is aborted when the canvas unmounts while it streams, and nothing is reported', async () => {
    const canvas = improving();
    cleanup();
    expect(canvas.last().signal.aborted).toBe(true);
    canvas.last().fail(new Error('late'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 40)));
    expect(canvas.onError).not.toHaveBeenCalled();
  });

  it('keeps a link in it out of reach of focus, and axe finds nothing', async () => {
    const canvas = improving();
    canvas.last().push('See [docs](https://quoin.test) now');
    await canvas.frame();
    expect(canvas.ghost()!.querySelector('a')).not.toBeNull();
    expect(canvas.ghost()).toHaveAttribute('inert');
    expect(await act(() => axe(canvas.container))).toHaveNoViolations();
  });

  it('ends the stream and goes when the canvas turns read-only, leaving the document as it was', async () => {
    const canvas = improving();
    canvas.last().push('one');
    await canvas.frame();
    act(() => canvas.handle().controller.setReadOnly(true));
    await act(() => Promise.resolve());
    expect(canvas.last().signal.aborted).toBe(true);
    expect(canvas.ghost()).toBeNull();
    expect(canvas.bar()).toBeNull();
    expect(canvas.shell('a')).not.toHaveAttribute('data-quoin-ai-room');
    expect(canvas.host('a').querySelector('.quoin-ai-replaced')).toBeNull();
    expect(canvas.markdown('a')).toBe('Say a word here');
  });
});
