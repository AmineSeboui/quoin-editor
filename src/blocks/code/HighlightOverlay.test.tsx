import { render } from '@testing-library/react';
import { QuoinProvider } from '../../context';
import { resetDevWarnings } from '../../dev-warn';
import type { CodeHighlighter } from './code-highlighter';
import { HighlightOverlay } from './HighlightOverlay';

const keywords: CodeHighlighter = (code) =>
  code.split('\n').map((line) =>
    line.split(/(let)/).flatMap((text) => {
      if (text === '') return [];
      return text === 'let' ? [{ text, color: 'rgb(200, 0, 0)', className: 'token-keyword' }] : [{ text }];
    }),
  );

function draw(code: string, highlight?: CodeHighlighter, language = 'js') {
  const { container } = render(
    <QuoinProvider value={{ blockTypes: [], highlight }}>
      <HighlightOverlay code={code} language={language} />
    </QuoinProvider>,
  );
  return container.querySelector('pre')!;
}

beforeEach(() => resetDevWarnings());

describe('HighlightOverlay', () => {
  it('draws the tokens of the host highlighter with their colours and classes, line by line', () => {
    const pre = draw('let a = 1;\nlet b;', keywords);
    const tokens = pre.querySelectorAll('span');
    expect([...tokens].map((token) => [token.textContent, token.style.color, token.className])).toEqual([
      ['let', 'rgb(200, 0, 0)', 'token-keyword'],
      [' a = 1;', '', ''],
      ['let', 'rgb(200, 0, 0)', 'token-keyword'],
      [' b;', '', ''],
    ]);
    expect(pre).toHaveTextContent('let a = 1; let b;');
    expect(pre.textContent).toBe('let a = 1;\nlet b;\n');
  });

  it('hands the highlighter the code and the language of the block', () => {
    const highlight = vi.fn<CodeHighlighter>((code) => [[{ text: code }]]);
    draw('x', highlight, 'python');
    expect(highlight).toHaveBeenCalledWith('x', 'python');
  });

  it('shows the code as plain text without a highlighter', () => {
    const pre = draw('let a;');
    expect(pre.querySelector('span')).toBeNull();
    expect(pre.textContent).toBe('let a;\n');
  });

  it('shows plain text, and warns, when the tokens do not spell the code', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pre = draw('let a;', () => [[{ text: 'let', color: 'red' }]]);
    expect(pre.querySelector('span')).toBeNull();
    expect(pre.textContent).toBe('let a;\n');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('highlight');
    warn.mockRestore();
  });

  it('shows plain text, and warns, when the highlighter throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pre = draw('let a;', () => {
      throw new Error('no grammar');
    });
    expect(pre.textContent).toBe('let a;\n');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it.each([
    ['nothing', () => undefined],
    ['a string', () => 'let a;'],
    ['an object', () => ({ value: 'let a;' })],
    ['a line that is not a list', () => [null]],
    ['a token that is not an object', () => [[null]]],
  ])('shows plain text, and warns, when the highlighter returns %s', (_shape, wrong) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pre = draw('let a;', wrong as unknown as CodeHighlighter);
    expect(pre.textContent).toBe('let a;\n');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('renders the text of a token as text, never as markup', () => {
    const pre = draw('<b>x</b>', (code) => [[{ text: code, color: 'blue' }]]);
    expect(pre.querySelector('b')).toBeNull();
    expect(pre.querySelector('span')).toHaveTextContent('<b>x</b>');
  });
});
