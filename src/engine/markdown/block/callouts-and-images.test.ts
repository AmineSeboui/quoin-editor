import { describe, expect, it } from 'vitest';
import { md, parse } from './block-fixtures';

const callout = (tone: string, body: string, indent?: number) => ({
  type: 'CALLOUT',
  data: { tone, body },
  ...(indent ? { indent } : {}),
});
const image = (alt: string, url: string, caption?: string) => ({
  type: 'IMAGE',
  data: { storageKey: '', alt, url, ...(caption ? { caption } : {}) },
});

describe('GitHub alerts', () => {
  it.each([
    ['NOTE', 'info'],
    ['TIP', 'tip'],
    ['IMPORTANT', 'success'],
    ['WARNING', 'warning'],
    ['CAUTION', 'danger'],
  ])('maps %s to the %s tone', (name, tone) => {
    expect(parse(`> [!${name}]\n> text`)).toEqual([callout(tone, 'text')]);
  });

  it('reads an empty alert and trailing spaces after the marker', () => {
    expect(parse('> [!NOTE]')).toEqual([callout('info', '')]);
    expect(parse('> [!TIP]  \n> spaced')).toEqual([callout('tip', 'spaced')]);
  });

  it('joins paragraphs with a hard break and keeps the hard breaks inside them', () => {
    expect(parse('> [!NOTE]\n>\n> one\n>\n> two')).toEqual([callout('info', 'one\\\ntwo')]);
    expect(parse('> [!NOTE]\n> a\\\n> b')).toEqual([callout('info', 'a\\\nb')]);
    expect(parse('> [!NOTE]\n> a\n> b', 'newline')).toEqual([callout('info', 'a\\\nb')]);
  });

  it('writes the body as canonical inline markdown', () => {
    expect(parse('> [!WARNING]\n> Be **careful** and *quick*')).toEqual([callout('warning', 'Be **careful** and _quick_')]);
  });

  it('keeps the blocks after the leading paragraphs as quote blocks', () => {
    expect(parse('> [!NOTE]\n> a\n> - b\n> - c\n> after')).toEqual([callout('info', 'a'), md('> b'), md('> c after')]);
  });

  it('is a plain quote unless the first line is exactly the marker', () => {
    expect(parse('> [!note]\n> lower')).toEqual([md('> \\[!note\\] lower')]);
    expect(parse('> [!NOTE] trailing\n> x')).toEqual([md('> \\[!NOTE\\] trailing x')]);
    expect(parse('> text\n> [!NOTE]\n> x')).toEqual([md('> text \\[!NOTE\\] x')]);
  });

  it('sits at the indent of its list item', () => {
    expect(parse('- > [!NOTE]\n  > in list')).toEqual([md('- '), callout('info', 'in list', 1)]);
  });
});

describe('images', () => {
  it.each([
    ['![Alt](https://x/i.png)', image('Alt', 'https://x/i.png')],
    ['![Alt](https://x/i.png "Cap")', image('Alt', 'https://x/i.png', 'Cap')],
    ["![a](/p.png 'single')", image('a', '/p.png', 'single')],
    ['![a](/p.png (paren))', image('a', '/p.png', 'paren')],
    ['![](/rel.png)', image('', '/rel.png')],
    ['![a [b] c](/p.png)', image('a [b] c', '/p.png')],
    ['![Alt text with *emph*](/rel.png "T")', image('Alt text with emph', '/rel.png', 'T')],
    ['![a](<my file.png>)', image('a', 'my file.png')],
    ['![a](x.png "t")  ', image('a', 'x.png', 't')],
    ['![a](#anchor)', image('a', '#anchor')],
    ['![a \\] b](x.png)', image('a ] b', 'x.png')],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual([expected]));

  it('stays text when anything else shares the paragraph or the url is unsafe', () => {
    expect(parse('![a](x.png) trailing')).toEqual([md('\\!\\[a\\](x.png) trailing')]);
    expect(parse('before ![a](x.png)')).toEqual([md('before \\!\\[a\\](x.png)')]);
    expect(parse('![a](x.png)\n![b](y.png)')).toEqual([md('\\!\\[a\\](x.png) \\!\\[b\\](y.png)')]);
    expect(parse('![a](javascript:alert(1))')).toEqual([md('\\!\\[a\\](javascript:alert(1))')]);
    expect(parse('![a]()')).toEqual([md('\\!\\[a\\]()')]);
    expect(parse('![a [b](x.png)')).toEqual([md('\\!\\[a [b](x.png)')]);
    expect(parse('- ![a](x.png)')).toEqual([md('- \\!\\[a\\](x.png)')]);
  });

  it('reads an image inside a quote as an image block', () => {
    expect(parse('> ![a](x.png)')).toEqual([image('a', 'x.png')]);
  });
});
