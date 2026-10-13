import { describe, expect, it } from 'vitest';
import { code, md, parse } from './block-fixtures';

describe('link reference definitions', () => {
  it.each([
    ['[foo]: /url "title"\n\n[foo]', '[foo](/url "title")'],
    ["   [foo]: \n      /url  \n           'the title'  \n\n[foo]", '[foo](/url "the title")'],
    ["[Foo*bar\\]]:my_(url) 'title (with parens)'\n\n[Foo*bar\\]]", '[Foo\\*bar\\]](my_(url) "title (with parens)")'],
    ["[Foo bar]:\n<my url>\n'title'\n\n[Foo bar]", '[Foo bar](<my url> "title")'],
    ['[foo]:\n/url\n\n[foo]', '[foo](/url)'],
    ['[foo]: <>\n\n[foo]', '[foo]()'],
    ['[foo]: /url ""\n\n[foo]', '[foo](/url)'],
    ['[foo]\n\n[foo]: url', '[foo](url)'],
    ['[foo]\n\n[foo]: first\n[foo]: second', '[foo](first)'],
    ['[FOO]: /url\n\n[Foo]', '[Foo](/url)'],
    ['[foo]\n\n> [foo]: /url', '[foo](/url)'],
    ['[foo]: /foo-url "foo"\n[bar]: /bar-url\n  "bar"\n[baz]: /baz-url\n\n[foo],\n[bar],\n[baz]', '[foo](/foo-url "foo"), [bar](/bar-url "bar"), [baz](/baz-url)'],
  ])('resolves %j', (input, expected) => expect(parse(input)).toEqual([md(expected)]));

  it.each([
    ['[Foo   BAR]: /u\n\n[foo bar]', '[foo bar](/u)'],
    ['[a\\]b]: /u\n\nsee [a\\]b]', 'see [a\\]b](/u)'],
    ['[text][L]\n\n[l]: /u', '[text](/u)'],
    ['[l][]\n\n[l]: /u', '[l](/u)'],
    ['[multi\nline]: /u\n\n[multi line]', '[multi line](/u)'],
    ['[[x]] and [x]\n\n[x]: /u', '\\[[x](/u)\\] and [x](/u)'],
  ])('matches a label however it is written: %j', (input, expected) => {
    expect(parse(input)).toEqual([md(expected)]);
  });

  it('resolves many definitions across many paragraphs quickly', () => {
    const count = 3000;
    const definitions = Array.from({ length: count }, (_, i) => `[r${i}]: /u${i}`).join('\n');
    const uses = Array.from({ length: count }, (_, i) => `see [r${i}]`).join('\n\n');
    const started = performance.now();
    const blocks = parse(`${definitions}\n\n${uses}`);
    expect(blocks).toHaveLength(count);
    expect(blocks[count - 1]).toEqual(md(`see [r${count - 1}](/u${count - 1})`));
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('removes the definition from the output, with or without a title', () => {
    expect(parse('[foo]: /url')).toEqual([]);
    expect(parse('[foo]: /url\n"title" ok')).toEqual([md('"title" ok')]);
    expect(parse('[\nfoo\n]: /url\nbar')).toEqual([md('bar')]);
    expect(parse('[foo]: /url\nbar\n===\n[foo]')).toEqual([md('# bar'), md('[foo](/url)')]);
  });

  it.each([
    ['[foo]: /url "title" ok', '\\[foo\\]: /url "title" ok'],
    ["[foo]: /url 'title\n\nwith blank line'", "\\[foo\\]: /url 'title"],
    ['[foo]:\n\n[foo]', '\\[foo\\]:'],
    ['[foo]: <bar>(baz)', '\\[foo\\]: \\<bar>(baz)'],
    ['Foo\n[bar]: /baz', 'Foo \\[bar\\]: /baz'],
  ])('keeps %j as text', (input, expected) => expect(parse(input)[0]).toEqual(md(expected)));

  it('ignores definitions in code and unsafe destinations', () => {
    expect(parse('    [foo]: /url "title"\n\n[foo]')).toEqual([code('[foo]: /url "title"'), md('\\[foo\\]')]);
    expect(parse('```\n[foo]: /url\n```\n\n[foo]')).toEqual([code('[foo]: /url'), md('\\[foo\\]')]);
    expect(parse('[foo][bar]\n\n[bar]: javascript:alert(1)')).toEqual([md('foo')]);
  });
});
