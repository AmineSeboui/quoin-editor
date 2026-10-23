// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { escapeXml, xmlElement } from './xml';

describe('escapeXml', () => {
  it('escapes the characters that end text or an attribute', () => {
    expect(escapeXml(`a < b & "c" 'd' >`)).toBe('a &lt; b &amp; &quot;c&quot; &apos;d&apos; &gt;');
  });

  it('drops the characters XML 1.0 cannot hold, keeping tabs, newlines and astral characters', () => {
    expect(escapeXml('a\u0000b\u0008c\u000Bd\u001Fe\tf\ng\rh\uFFFEi\uFFFFj\u{1F389}')).toBe('abcde\tf\ng\rhij\u{1F389}');
  });

  it('drops lone surrogates', () => {
    expect(escapeXml('x\uD800y\uDC00z')).toBe('xyz');
  });
});

describe('xmlElement', () => {
  it('writes escaped attributes, leaving out undefined ones, around XML already written', () => {
    expect(xmlElement('w:t', { 'xml:space': 'preserve', 'w:val': undefined }, escapeXml('a&b'))).toBe(
      '<w:t xml:space="preserve">a&amp;b</w:t>',
    );
    expect(xmlElement('w:color', { 'w:val': '"x"' })).toBe('<w:color w:val="&quot;x&quot;"/>');
    expect(xmlElement('w:r', {}, '<w:t>a</w:t><w:br/>')).toBe('<w:r><w:t>a</w:t><w:br/></w:r>');
  });

  it('closes an element with nothing inside', () => {
    expect(xmlElement('w:b')).toBe('<w:b/>');
  });
});
