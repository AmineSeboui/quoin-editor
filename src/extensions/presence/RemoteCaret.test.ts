import { englishPresenceLabels } from './presence-labels';
import { remoteCaret } from './RemoteCaret';

const decoration = (attrs: Record<string, string>) =>
  ({
    kind: 'widget',
    block: 'a',
    region: 'text',
    offset: 1,
    key: 'presence:7',
    widget: 'presence-caret',
    attrs,
  }) as const;

describe('a collaborator caret', () => {
  it('is hidden from assistive technology and shows the name in its own colour', () => {
    const caret = remoteCaret(englishPresenceLabels)(
      decoration({ 'data-name': 'Ada', style: '--quoin-presence:#e11d48' }),
      document,
    );
    expect(caret.getAttribute('aria-hidden')).toBe('true');
    expect(caret.className).toBe('quoin-presence-caret');
    expect(caret.getAttribute('style')).toBe('--quoin-presence:#e11d48');
    expect(caret.textContent).toBe('Ada');
    expect(caret.hasAttribute('data-idle')).toBe(false);
  });

  it('marks an idle collaborator, so its name fades', () => {
    const caret = remoteCaret(englishPresenceLabels)(decoration({ 'data-name': 'Ada', 'data-idle': '' }), document);
    expect(caret.hasAttribute('data-idle')).toBe(true);
    expect(caret.hasAttribute('style')).toBe(false);
  });
});
