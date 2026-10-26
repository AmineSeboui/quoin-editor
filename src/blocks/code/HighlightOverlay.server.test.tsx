// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { CodeHighlighter } from './code-highlighter';

const colours = ['red;background-image:url(https://t.example/x)', '#0a0B0c', 'var(--shiki-token-keyword)', 'rgb(1 2 3 / 50%)', 'hsl(var(--primary))'];
const highlight: CodeHighlighter = (code) => [[...code].map((text, at) => ({ text, color: colours[at] }))];

describe('HighlightOverlay rendered on the server', () => {
  it('leaves out a token colour that could leave its declaration, and keeps the others', () => {
    const html = renderToString(
      <BlockCanvas blocks={[{ id: 'c', type: 'CODE', data: { language: '', code: 'abcde' } }]} onChange={() => {}} highlight={highlight} />,
    );
    expect(html).not.toContain('background-image');
    expect(html).toContain('<span>a</span>');
    expect(html).toContain('<span style="color:#0a0B0c">b</span>');
    expect(html).toContain('<span style="color:var(--shiki-token-keyword)">c</span>');
    expect(html).toContain('<span style="color:rgb(1 2 3 / 50%)">d</span>');
    expect(html).toContain('<span style="color:hsl(var(--primary))">e</span>');
  });
});
