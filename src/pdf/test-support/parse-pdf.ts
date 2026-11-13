export class PdfName {
  constructor(readonly name: string) {}
}

export class PdfRef {
  constructor(readonly id: number) {}
}

export class PdfString {
  constructor(
    readonly bytes: Uint8Array,
    readonly hex: boolean,
  ) {}
}

export type PdfDict = { [key: string]: PdfValue };
export type PdfValue = number | boolean | null | PdfName | PdfRef | PdfString | PdfValue[] | PdfDict;

const WHITESPACE = new Set([0, 9, 10, 12, 13, 32]);
const DELIMITERS = new Set([...'()<>[]{}/%'].map((char) => char.charCodeAt(0)));

/** Reads PDF values from `bytes`, starting at `at`, the way a reader's lexer does. */
export class PdfLexer {
  constructor(
    readonly bytes: Uint8Array,
    public at = 0,
  ) {}

  skipSpace(): void {
    for (;;) {
      while (this.at < this.bytes.length && WHITESPACE.has(this.bytes[this.at])) this.at++;
      if (this.bytes[this.at] !== 0x25) return;
      while (this.at < this.bytes.length && this.bytes[this.at] !== 10 && this.bytes[this.at] !== 13) this.at++;
    }
  }

  private char(offset = 0): string {
    return String.fromCharCode(this.bytes[this.at + offset]);
  }

  word(): string {
    this.skipSpace();
    const start = this.at;
    while (this.at < this.bytes.length && !WHITESPACE.has(this.bytes[this.at]) && !DELIMITERS.has(this.bytes[this.at])) {
      this.at++;
    }
    return String.fromCharCode(...this.bytes.subarray(start, this.at));
  }

  expect(word: string): void {
    const found = this.word();
    if (found !== word) throw new Error(`expected ${word} at ${this.at}, found ${found}`);
  }

  value(): PdfValue {
    this.skipSpace();
    const char = this.char();
    if (char === '<' && this.char(1) === '<') return this.dict();
    if (char === '<') return this.hexString();
    if (char === '(') return this.literalString();
    if (char === '[') return this.array();
    if (char === '/') return this.name();
    const word = this.word();
    if (word === 'true' || word === 'false') return word === 'true';
    if (word === 'null') return null;
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(word)) throw new Error(`unexpected ${JSON.stringify(word)} at ${this.at}`);
    const mark = this.at;
    const generation = this.word();
    if (/^\d+$/.test(word) && /^\d+$/.test(generation) && this.word() === 'R') return new PdfRef(Number(word));
    this.at = mark;
    return Number(word);
  }

  private dict(): PdfDict {
    this.at += 2;
    const dict: PdfDict = {};
    for (;;) {
      this.skipSpace();
      if (this.char() === '>' && this.char(1) === '>') {
        this.at += 2;
        return dict;
      }
      const key = this.value();
      if (!(key instanceof PdfName)) throw new Error(`a dictionary key at ${this.at} is no name`);
      dict[key.name] = this.value();
    }
  }

  private array(): PdfValue[] {
    this.at++;
    const items: PdfValue[] = [];
    for (;;) {
      this.skipSpace();
      if (this.char() === ']') {
        this.at++;
        return items;
      }
      items.push(this.value());
    }
  }

  private name(): PdfName {
    this.at++;
    const raw = this.word();
    return new PdfName(raw.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
  }

  private hexString(): PdfString {
    const end = this.bytes.indexOf(0x3e, this.at);
    const digits = String.fromCharCode(...this.bytes.subarray(this.at + 1, end)).replace(/\s/g, '');
    if (!/^[0-9a-fA-F]*$/.test(digits)) throw new Error(`a hex string at ${this.at} holds ${digits}`);
    this.at = end + 1;
    const padded = digits.length % 2 ? `${digits}0` : digits;
    return new PdfString(Uint8Array.from(padded.match(/../g) ?? [], (pair) => parseInt(pair, 16)), true);
  }

  private literalString(): PdfString {
    const out: number[] = [];
    let depth = 0;
    this.at++;
    for (;;) {
      const byte = this.bytes[this.at++];
      if (byte === undefined) throw new Error('an unterminated string');
      if (byte === 0x29 && depth === 0) return new PdfString(Uint8Array.from(out), false);
      if (byte === 0x28) depth++;
      if (byte === 0x29) depth--;
      if (byte !== 0x5c) {
        out.push(byte);
        continue;
      }
      const next = String.fromCharCode(this.bytes[this.at++]);
      const octal = /[0-7]/.test(next) ? /^[0-7]{1,3}/.exec(next + this.char() + this.char(1))![0] : '';
      if (octal) {
        this.at += octal.length - 1;
        out.push(parseInt(octal, 8) & 0xff);
      } else if (next !== '\n' && next !== '\r') {
        out.push(({ n: 10, r: 13, t: 9, b: 8, f: 12 } as Record<string, number>)[next] ?? next.charCodeAt(0));
      }
    }
  }
}
