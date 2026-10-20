import { atom, coreExtensions, parseInline, text } from '../../engine';
import { caret, key, md, startEditor } from '../../engine/test-support/editor-fixtures';
import { mathExtension } from './math-extension';

const math = (latex: string) => atom('math', { latex });

function editorAt(markdown: string, offset = markdown.length) {
  const { editor } = startEditor([md('p', markdown)], { extensions: [...coreExtensions(), mathExtension()] });
  editor.commands.setSelection(caret('p', offset));
  const content = () => editor.state.doc.blocks[0].regions.text;
  const type = (typed: string) => [...typed].forEach((char) => editor.insertText(char));
  return { editor, content, type };
}

function typed(value: string) {
  const { content, type } = editorAt('');
  type(value);
  return content();
}

describe('the inline math input rule', () => {
  it('input rule converts $x^2$ into a math atom as its closing dollar is typed, the caret after it', () => {
    const { editor, content, type } = editorAt('Area');
    type(' $x^2$');
    expect(content()).toEqual([text('Area '), math('x^2')]);
    expect(editor.state.selection).toEqual(caret('p', 6));
    type(' m');
    expect(content()).toEqual([text('Area '), math('x^2'), text(' m')]);
  });

  it.each(['it costs $5 and $10', 'Pay $5 now or 4$ later', '$5 and 6$', 'from $5 to $10$', 'x $1,000.50$ y', 'a $ b$', 'a $b $', '$$x$$'])(
    'never converts %j, which the markdown parser keeps as text',
    (value) => {
      expect(parseInline(value)).toEqual([text(value)]);
      expect(typed(value)).toEqual([text(value)]);
    },
  );

  it.each(['$x$', 'a $x+1$ b', '($5$)', '$x$$y$', 'a $b $c$', '$a$ b $c$', '$e^{i\\pi}$'])(
    'reads %j as the markdown parser does',
    (value) => {
      expect(typed(value)).toEqual(parseInline(value));
    },
  );

  it('opens no math at an escaped dollar, and does after an escaped backslash', () => {
    expect(typed('\\$x$')).toEqual([text('\\$x$')]);
    expect(typed('\\\\$x$')).toEqual([text('\\\\'), math('x')]);
  });

  it('reads a dollar escaped inside the formula as a dollar of the formula', () => {
    expect(typed('$a\\$b$')).toEqual([math('a$b')]);
  });

  it('converts in the middle of a line, from the dollar that opens the span to the one typed', () => {
    const { content, type } = editorAt('a $x b', 4);
    type('$');
    expect(content()).toEqual([text('a '), math('x'), text(' b')]);
  });

  it('never converts across an atom, or touching code', () => {
    const across = editorAt('\\$a $x$ b');
    across.type('$');
    expect(across.content()).toEqual([text('$a '), math('x'), text(' b$')]);

    const code = editorAt('$a `x` b');
    code.type('$');
    expect(code.content()).toEqual([text('$a '), text('x', [{ type: 'code' }]), text(' b$')]);
  });

  it('keeps the marks of the opening dollar on the atom', () => {
    const { content, type } = editorAt('**a $x**');
    type('$');
    expect(content()).toEqual([text('a ', [{ type: 'bold' }]), atom('math', { latex: 'x' }, [{ type: 'bold' }])]);
  });

  it('is one undo step, and Backspace right after it gives the typed dollar back as text rather than selecting the atom', () => {
    const undone = editorAt('a $x');
    undone.type('$');
    undone.editor.commands.undo();
    expect(undone.content()).toEqual([text('a $x')]);

    const { editor, content, type } = editorAt('a $x');
    type('$');
    editor.handleKey(key('Backspace'));
    expect(content()).toEqual([text('a $x$')]);
    expect(editor.state.selection).toEqual(caret('p', 5));
  });
});
