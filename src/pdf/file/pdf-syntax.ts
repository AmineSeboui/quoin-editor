export type PdfEntries = Readonly<Record<string, string | number | undefined>>;

/** A number as PDF writes it: at most three decimals, and never an exponent or a negative zero. */
export function pdfNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? '0' : String(rounded);
}

const write = (value: string | number) => (typeof value === 'number' ? pdfNumber(value) : value);

const hex2 = (code: number) => code.toString(16).padStart(2, '0');

/** A name, its delimiters and the characters outside printable ASCII written as `#` and two hex digits. */
export const pdfName = (name: string): string => `/${name.replace(/[^!-~]|[()<>[\]{}/%#]/g, (char) => `#${hex2(char.charCodeAt(0) & 0xff)}`)}`;

export const pdfRef = (id: number): string => `${id} 0 R`;

export const pdfArray = (items: readonly (string | number)[]): string => `[${items.map(write).join(' ')}]`;

/** A dictionary of values already written; an undefined value leaves its key out. */
export const pdfDict = (entries: PdfEntries): string =>
  `<<${Object.entries(entries)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${pdfName(key)} ${write(value)}`)
    .join(' ')}>>`;

/** A text string a reader shows, such as a title, in UTF-16 with its byte order mark. */
export function pdfText(text: string): string {
  let hex = 'FEFF';
  for (let at = 0; at < text.length; at++) hex += text.charCodeAt(at).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

/** A literal string of ASCII, such as an address. */
export const pdfLiteral = (text: string): string => `(${text.replace(/[()\\]/g, (char) => `\\${char}`)})`;
