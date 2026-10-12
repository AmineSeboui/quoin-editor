import { describe, expect, it } from 'vitest';
import { md, parse } from './block-fixtures';
import { parseQuoinComment } from './quoin-comment';

describe('parseQuoinComment', () => {
  it.each([
    ['<!-- quoin:toc -->', { type: 'TOC', data: {}, indent: 0 }],
    ['<!--quoin:toc-->', { type: 'TOC', data: {}, indent: 0 }],
    ['<!-- quoin:PLUGIN -->', { type: 'PLUGIN', data: {}, indent: 0 }],
    ['<!-- quoin:PLUGIN {"data":{"a":1}} -->', { type: 'PLUGIN', data: { a: 1 }, indent: 0 }],
    ['<!-- quoin:PLUGIN {"indent":2} -->', { type: 'PLUGIN', data: {}, indent: 2 }],
    ['<!-- quoin:my-block_2 {"data":{},"indent":0} -->  ', { type: 'my-block_2', data: {}, indent: 0 }],
    ['<!-- quoin:acme.chart:v2 -->', { type: 'acme.chart:v2', data: {}, indent: 0 }],
    ['<!-- quoin:PLUGIN-->', { type: 'PLUGIN', data: {}, indent: 0 }],
    ['<!-- quoin:X {"data":{"a":"}"}} -->', { type: 'X', data: { a: '}' }, indent: 0 }],
  ])('reads %j', (line, expected) => expect(parseQuoinComment(line)).toEqual(expected));

  it.each([
    '<!-- note -->',
    '<!-- quoin: -->',
    '<!-- quoin:1x -->',
    '<!-- quoin:PLUGIN {bad json} -->',
    '<!-- quoin:PLUGIN [1] -->',
    '<!-- quoin:PLUGIN {"data":[1]} -->',
    '<!-- quoin:PLUGIN {"data":null} -->',
    '<!-- quoin:PLUGIN {"data":{},"indent":-1} -->',
    '<!-- quoin:PLUGIN {"data":{},"indent":1.5} -->',
    '<!-- quoin:PLUGIN {"data":{},"indent":"1"} -->',
    '<!-- quoin:PLUGIN {"data":{}} --> trailing',
    'text <!-- quoin:toc -->',
  ])('rejects %j', (line) => expect(parseQuoinComment(line)).toBeNull());
});

describe('quoin comments in documents', () => {
  it('restores each block at the indent of its container plus its own', () => {
    expect(parse('<!-- quoin:PLUGIN {"data":{"k":1},"indent":1} -->')).toEqual([
      { type: 'PLUGIN', data: { k: 1 }, indent: 1 },
    ]);
    expect(parse('- item\n  <!-- quoin:PLUGIN {"data":{},"indent":1} -->')).toEqual([
      md('- item'),
      { type: 'PLUGIN', data: {}, indent: 2 },
    ]);
    expect(parse('<details>\n<summary>S</summary>\n<!-- quoin:FILE {"data":{"storageKey":"f"}} -->\n</details>')).toEqual([
      { type: 'TOGGLE', data: { markdown: 'S', open: false } },
      { type: 'FILE', data: { storageKey: 'f' }, indent: 1 },
    ]);
  });

  it('interrupts a paragraph and keeps a malformed comment as text', () => {
    expect(parse('text\n<!-- quoin:toc -->\nmore')).toEqual([md('text'), { type: 'TOC', data: {} }, md('more')]);
    expect(parse('<!-- quoin:PLUGIN {bad} -->')).toEqual([md('\\<!-- quoin:PLUGIN {bad} -->')]);
  });

  it('keeps an ordinary HTML comment as text', () => {
    expect(parse('<!-- note -->')).toEqual([md('\\<!-- note -->')]);
  });
});
