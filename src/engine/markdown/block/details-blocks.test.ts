import { describe, expect, it } from 'vitest';
import { code, md, parse } from './block-fixtures';

const toggle = (summary: string, open = false, indent?: number) => ({
  type: 'TOGGLE',
  data: { markdown: summary, open },
  ...(indent ? { indent } : {}),
});

describe('details toggles', () => {
  it.each([
    ['<details>\n<summary>S</summary>\n\nbody\n</details>', [toggle('S'), md('body', 1)]],
    ['<details>\n\n<summary>S</summary>\n\nbody\n</details>\nafter', [toggle('S'), md('body', 1), md('after')]],
    ['<details><summary>S</summary>\ntext\n</details>', [toggle('S'), md('text', 1)]],
    ['<details>\ntext only\n</details>', [toggle(''), md('text only', 1)]],
    ['<details></details>', [toggle('')]],
    ['<details>\n<summary>S</summary>\n</details>', [toggle('S')]],
    ['<DETAILS>\n<SUMMARY>Up</SUMMARY>\nx\n</DETAILS>', [toggle('Up'), md('x', 1)]],
    ['<details>\n  <summary>S</summary>\n  </details>', [toggle('S')]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));

  it('reads the open attribute among others', () => {
    expect(parse('<details open>\n<summary>S</summary>\n</details>')).toEqual([toggle('S', true)]);
    expect(parse('<details open="">\n</details>')).toEqual([toggle('', true)]);
    expect(parse('<details class="a" open>\n</details>')).toEqual([toggle('', true)]);
    expect(parse('<details class="open">\n</details>')).toEqual([toggle('', false)]);
  });

  it('writes the summary as canonical inline markdown', () => {
    expect(parse('<details>\n<summary>**bold** and <u>u</u></summary>\n</details>')).toEqual([
      toggle('**bold** and <u>u</u>'),
    ]);
  });

  it('reads a summary over several lines and ends an unclosed one at a blank line', () => {
    expect(parse('<details>\n<summary>\nTitle\n</summary>\nbody\n</details>')).toEqual([toggle('Title'), md('body', 1)]);
    expect(parse('<details>\n<summary>Multi\nline</summary>\nx\n</details>')).toEqual([toggle('Multi line'), md('x', 1)]);
    expect(parse('<details>\n<summary>unclosed\n\nbody\n</details>')).toEqual([toggle('unclosed'), md('body', 1)]);
  });

  it('reads a summary only as the first thing in the details', () => {
    expect(parse('<summary>alone</summary>')).toEqual([md('\\<summary>alone\\</summary>')]);
    expect(parse('<details>\ntext\n<summary>S</summary>\n</details>')).toEqual([
      toggle(''),
      md('text', 1),
      md('\\<summary>S\\</summary>', 1),
    ]);
  });

  it('puts every child one indent deeper and nests', () => {
    expect(parse('<details>\n<summary>S</summary>\n- a\n- b\n</details>\nafter')).toEqual([
      toggle('S'),
      md('- a', 1),
      md('- b', 1),
      md('after'),
    ]);
    expect(
      parse('<details>\n<summary>Outer</summary>\n<details>\n<summary>Inner</summary>\nx\n</details>\ny\n</details>\nz'),
    ).toEqual([toggle('Outer'), toggle('Inner', false, 1), md('x', 2), md('y', 1), md('z')]);
  });

  it('keeps the children of an unclosed details to the end of the document', () => {
    expect(parse('<details>\nunclosed\n\nmore')).toEqual([toggle(''), md('unclosed', 1), md('more', 1)]);
  });

  it('closes on its end tag from inside a list, a quote, or an HTML block', () => {
    expect(parse('<details>\n<summary>S</summary>\n\n<img src="a.png">\n</details>\nafter')).toEqual([
      toggle('S'),
      md('\\<img src="a.png">', 1),
      md('after'),
    ]);
    expect(parse('<details>\n<div>\ntext\n</details>\nafter')).toEqual([toggle(''), md('\\<div> text', 1), md('after')]);
    expect(parse('<details>\n- a\n  </details>\nafter')).toEqual([toggle(''), md('- a', 1), md('after')]);
  });

  it('does not close on an end tag inside code or a paragraph continuation', () => {
    expect(parse('<details>\n<summary>S</summary>\n```\n</details>\n```\n</details>')).toEqual([
      toggle('S'),
      code('</details>', '', 1),
    ]);
    expect(parse('<details>\n<summary>S</summary>\ntext\n    </details>')).toEqual([toggle('S'), md('text \\</details>', 1)]);
  });

  it('works inside list items and quotes', () => {
    expect(parse('- <details>\n  <summary>S</summary>\n  body\n  </details>\n- next')).toEqual([
      md('- '),
      toggle('S', false, 1),
      md('body', 2),
      md('- next'),
    ]);
    expect(parse('> <details>\n> <summary>S</summary>\n> body\n> </details>')).toEqual([toggle('S'), md('> body', 1)]);
  });

  it('opens on a line after a paragraph and not when indented four spaces', () => {
    expect(parse('text\n<details>\nx\n</details>')).toEqual([md('text'), toggle(''), md('x', 1)]);
    expect(parse('    <details>\n    x')).toEqual([code('<details>\nx')]);
  });

  it('reads a stray end tag as text', () => {
    expect(parse('</details>\nstray')).toEqual([md('\\</details> stray')]);
    expect(parse('a\n</details>')).toEqual([md('a'), md('\\</details>')]);
  });
});

describe('toggle summaries that contain a closing summary tag', () => {
  it('keeps the tag inside a code span', () => {
    expect(parse('<details>\n<summary>`</summary>`</summary>\n</details>')).toEqual([toggle('`</summary>`')]);
  });

  it('keeps an escaped tag', () => {
    expect(parse('<details open>\n<summary>a \\</summary> b</summary>\n\nchild\n\n</details>')).toEqual([
      toggle('a \\</summary> b', true),
      md('child', 1),
    ]);
  });

  it('keeps the tag on every line of a summary written over several lines', () => {
    const input = '<details>\n<summary>x \\</summary>\\\n`</summary>`\\\n\\</summary> y</summary>\n</details>';
    expect(parse(input)).toEqual([toggle('x \\</summary>\\\n`</summary>`\\\n\\</summary> y')]);
  });

  it('ends the summary at a closing tag followed by spaces or tabs', () => {
    expect(parse('<details>\n<summary>`</summary>`</summary> \t \nbody\n</details>')).toEqual([
      toggle('`</summary>`'),
      md('body', 1),
    ]);
  });

  it('keeps reading foreign html that closes the summary in the middle of a line', () => {
    expect(parse('<details>\n<summary>T</summary> more\nbody\n</details>')).toEqual([toggle('T'), md('body', 1)]);
    expect(parse('<details>\n<summary>T</summary> more\n\nbody\n</details>')).toEqual([toggle('T'), md('body', 1)]);
  });
});

