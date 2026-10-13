import { describe, expect, it } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { caret, key, md, mod, startEditor } from '../test-support/editor-fixtures';
import { insertTextWithRules } from './input-rule';
import { markInputRules } from './mark-rules';

const markdownOfEditor = (editor: ReturnType<typeof startEditor>['editor']) =>
  editor.getBlocks().map((block) => block.data.markdown);

describe('reverting an input rule with Backspace', () => {
  it('restores the typed text with the marks that were active before the rule', () => {
    const { editor } = startEditor([md('a', '**a..**')], { extensions: coreExtensions({ typography: {} }) });
    editor.commands.setSelection(caret('a', 3));
    editor.insertText('.');
    expect(markdownOfEditor(editor)).toEqual(['**a\u2026**']);
    editor.handleKey(key('Backspace'));
    expect(markdownOfEditor(editor)).toEqual(['**a...**']);
  });

  it('restores a delimiter inside an italic run as part of that run', () => {
    const { editor } = startEditor([md('a', '_x \\*\\*b\\*_')]);
    editor.commands.setSelection(caret('a', 6));
    editor.insertText('*');
    editor.handleKey(key('Backspace'));
    expect(markdownOfEditor(editor)).toEqual(['_x \\*\\*b\\*\\*_']);
  });

  it('forgets the rule when only the stored marks change', () => {
    const { editor } = startEditor([md('a', '')]);
    editor.insertText('-');
    editor.insertText(' ');
    expect(editor.getBlocks()[0].data.markdown).toBe('- ');
    editor.handleKey(mod('b'));
    editor.handleKey(key('Backspace'));
    expect(markdownOfEditor(editor)).toEqual(['']);
  });
});

describe('typography and the divider shortcut', () => {
  it.each(['em', 'en'] as const)('still makes a divider from three hyphens with %s dashes on', (dashes) => {
    const { editor } = startEditor([md('a', '')], { extensions: coreExtensions({ typography: { dashes } }) });
    for (let i = 0; i < 3; i++) editor.insertText('-');
    expect(editor.getBlocks().map((block) => block.type)).toEqual(['DIVIDER', 'MARKDOWN']);
  });

  it('keeps the dash for two hyphens', () => {
    const { editor } = startEditor([md('a', '')], { extensions: coreExtensions({ typography: { dashes: 'em' } }) });
    editor.insertText('-');
    editor.insertText('-');
    expect(markdownOfEditor(editor)).toEqual(['\u2014']);
  });
});

describe('the link rule and parentheses in the url', () => {
  const type = (paragraph: string, value: string) =>
    run(buildState([{ paragraph }], { block: 0, offset: paragraph.length }), insertTextWithRules(value, markInputRules)).state;

  it('links a url with balanced parentheses', () => {
    const state = type('[a](https://en.wikipedia.org/wiki/A_(b)', ')');
    expect(markdownOf(state)).toEqual(['[a](https://en.wikipedia.org/wiki/A_(b))']);
    expect(state.doc.blocks[0].regions.text).toEqual([
      { kind: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'https://en.wikipedia.org/wiki/A_(b)' } }] },
    ]);
  });

  it('waits for the parenthesis that closes the url', () => {
    const state = type('[a](https://en.wikipedia.org/wiki/A_(b', ')');
    expect(state.doc.blocks[0].regions.text.every((node) => node.marks.length === 0)).toBe(true);
  });

  it('still links a plain url', () => {
    expect(markdownOf(type('[a](https://a.b', ')'))).toEqual(['[a](https://a.b)']);
  });
});
