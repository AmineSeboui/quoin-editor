// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pdfFile } from './pdf-file';
import { pdfArray, pdfDict, pdfLiteral, pdfName, pdfNumber, pdfRef, pdfText } from './pdf-syntax';
import { PdfName, PdfRef, type PdfString } from '../test-support/parse-pdf';
import { readPdf } from '../test-support/read-pdf';

const encode = (text: string) => new TextEncoder().encode(text);

describe('pdf syntax', () => {
  it('writes numbers with at most three decimals, no exponent and no negative zero', () => {
    expect([1, 0.5, 1 / 3, -0.0001, 595.2756, 1e-9, 12_345.6789].map(pdfNumber)).toEqual([
      '1',
      '0.5',
      '0.333',
      '0',
      '595.276',
      '0',
      '12345.679',
    ]);
  });

  it('escapes the delimiters and the characters outside printable ASCII in a name', () => {
    expect(pdfName('Helvetica-Bold')).toBe('/Helvetica-Bold');
    expect(pdfName('A B(c)#/%')).toBe('/A#20B#28c#29#23#2f#25');
  });

  it('writes a dictionary and an array, leaving out undefined entries', () => {
    expect(pdfDict({ Type: pdfName('Page'), Count: 2, Kids: pdfArray([pdfRef(3), pdfRef(4)]), Missing: undefined })).toBe(
      '<</Type /Page /Count 2 /Kids [3 0 R 4 0 R]>>',
    );
  });

  it('writes a text string as UTF-16 with a byte order mark, and a literal string with its delimiters escaped', () => {
    expect(pdfText('A\u00E9\u{1F600}')).toBe('<FEFF004100E9D83DDE00>');
    expect(pdfLiteral('a(b)\\c')).toBe('(a\\(b\\)\\\\c)');
  });
});

describe('pdfFile', () => {
  const objects = [
    { value: pdfDict({ Type: pdfName('Catalog'), Pages: pdfRef(2) }) },
    { value: pdfDict({ Type: pdfName('Pages'), Kids: pdfArray([pdfRef(3)]), Count: 1 }) },
    { value: pdfDict({ Type: pdfName('Page'), Parent: pdfRef(2), MediaBox: pdfArray([0, 0, 100, 100]), Contents: pdfRef(4) }) },
    { dict: {}, data: encode('0 0 1 rg 10 10 50 50 re f') },
  ];

  it('opens with a header and a line of binary bytes, then closes with startxref and %%EOF', () => {
    const bytes = pdfFile(objects, { Root: pdfRef(1) });
    expect(new TextDecoder('latin1').decode(bytes.subarray(0, 9))).toBe('%PDF-1.7\n');
    expect(bytes[9]).toBe(0x25);
    expect([...bytes.subarray(10, 14)].every((byte) => byte > 127)).toBe(true);
    expect(bytes[14]).toBe(0x0a);
    expect(new TextDecoder().decode(bytes.subarray(-6))).toBe('%%EOF\n');
  });

  it('lists the offset of every object in its cross-reference table, and every object is reachable', () => {
    const file = readPdf(pdfFile(objects, { Root: pdfRef(1) }));
    expect([...file.objects.keys()]).toEqual([1, 2, 3, 4]);
    expect(file.trailer.Size).toBe(5);
    expect(file.trailer.Root).toEqual(new PdfRef(1));
    expect([...file.reachable()].sort()).toEqual([1, 2, 3, 4]);
    expect(file.pages).toHaveLength(1);
    expect(file.dict(file.pages[0].Parent).Type).toEqual(new PdfName('Pages'));
  });

  it('writes a stream with its length', () => {
    const file = readPdf(pdfFile(objects, { Root: pdfRef(1) }));
    expect(new TextDecoder().decode(file.stream(file.pages[0].Contents))).toBe('0 0 1 rg 10 10 50 50 re f');
    expect(file.dict(file.pages[0].Contents).Length).toBe(25);
  });

  it('reads back the strings it writes', () => {
    const file = readPdf(pdfFile([{ value: pdfDict({ Title: pdfText('Caf\u00E9'), URI: pdfLiteral('a(b)') }) }], { Info: pdfRef(1) }));
    const info = file.dict(file.trailer.Info);
    const title = info.Title as PdfString;
    expect(new TextDecoder('utf-16be').decode(title.bytes.subarray(2))).toBe('Caf\u00E9');
    expect(new TextDecoder().decode((info.URI as PdfString).bytes)).toBe('a(b)');
  });
});
