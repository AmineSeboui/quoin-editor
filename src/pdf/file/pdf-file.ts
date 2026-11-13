import { pdfDict, type PdfEntries } from './pdf-syntax';

export type PdfObject = { readonly value: string } | { readonly dict: PdfEntries; readonly data: Uint8Array };

// A comment of bytes above 127 on the second line tells a transfer tool the file is binary.
const HEADER = Uint8Array.of(...new TextEncoder().encode('%PDF-1.7\n%'), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a);

/** A PDF of `objects`, numbered from 1 in order, with a cross-reference table of their offsets. */
export function pdfFile(objects: readonly PdfObject[], trailer: PdfEntries): Uint8Array {
  const parts: Uint8Array[] = [HEADER];
  const offsets: number[] = [];
  let length = HEADER.length;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === 'string' ? new TextEncoder().encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  objects.forEach((object, index) => {
    offsets.push(length);
    if ('value' in object) {
      push(`${index + 1} 0 obj\n${object.value}\nendobj\n`);
    } else {
      push(`${index + 1} 0 obj\n${pdfDict({ ...object.dict, Length: object.data.length })}\nstream\n`);
      push(object.data);
      push('\nendstream\nendobj\n');
    }
  });
  const table = offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  const start = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${table}`);
  push(`trailer\n${pdfDict({ Size: objects.length + 1, ...trailer })}\nstartxref\n${start}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
