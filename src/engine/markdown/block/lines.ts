const LINE_BREAK = /\r\n|\r|\n/;
const NULL_CHAR = /\0/g;
const TAB_STOP = 4;

export const CODE_INDENT = 4;

export function splitLines(markdown: string): string[] {
  return markdown.replace(NULL_CHAR, '\uFFFD').split(LINE_BREAK);
}

export const isSpaceOrTab = (char: string | undefined): boolean => char === ' ' || char === '\t';

const isBlankChar = (char: string): boolean => char === ' ' || char === '\t' || char === '\n';

export function trimBlankEnd(text: string): string {
  let end = text.length;
  while (end > 0 && isBlankChar(text[end - 1])) end--;
  return text.slice(0, end);
}

export function trimBlankStart(text: string): string {
  let start = 0;
  while (start < text.length && isBlankChar(text[start])) start++;
  return text.slice(start);
}

export const trimBlank = (text: string): string => trimBlankStart(trimBlankEnd(text));

type Snapshot = { offset: number; column: number; partialTab: boolean };

// Tracks a position in one line by character offset and by column, so tabs count to the next
// multiple of four columns and a tab can be consumed in part. `rest()` fills a part-consumed tab
// with spaces and leaves any later tab alone, which keeps tabs inside code intact.
export class Cursor {
  line = '';
  offset = 0;
  column = 0;
  #partialTab = false;

  reset(line: string): void {
    this.line = line;
    this.offset = 0;
    this.column = 0;
    this.#partialTab = false;
  }

  #scan(): { index: number; column: number } {
    let index = this.offset;
    let column = this.column;
    for (; index < this.line.length; index++) {
      const char = this.line[index];
      if (char === ' ') column++;
      else if (char === '\t') column += TAB_STOP - (column % TAB_STOP);
      else break;
    }
    return { index, column };
  }

  get indent(): number {
    return this.#scan().column - this.column;
  }

  get indented(): boolean {
    return this.indent >= CODE_INDENT;
  }

  get blank(): boolean {
    return this.#scan().index >= this.line.length;
  }

  get text(): string {
    return this.line.slice(this.#scan().index);
  }

  get next(): string | undefined {
    return this.line[this.offset];
  }

  advanceToNonspace(): void {
    const { index, column } = this.#scan();
    this.offset = index;
    this.column = column;
    this.#partialTab = false;
  }

  advance(count: number, columns = false): void {
    let remaining = count;
    while (remaining > 0 && this.offset < this.line.length) {
      if (this.line[this.offset] !== '\t') {
        this.#partialTab = false;
        this.offset++;
        this.column++;
        remaining--;
        continue;
      }
      const width = TAB_STOP - (this.column % TAB_STOP);
      if (!columns) {
        this.#partialTab = false;
        this.column += width;
        this.offset++;
        remaining--;
        continue;
      }
      const step = Math.min(width, remaining);
      this.#partialTab = width > remaining;
      this.column += step;
      if (!this.#partialTab) this.offset++;
      remaining -= step;
    }
  }

  rest(): string {
    if (!this.#partialTab) return this.line.slice(this.offset);
    return ' '.repeat(TAB_STOP - (this.column % TAB_STOP)) + this.line.slice(this.offset + 1);
  }

  mark(): Snapshot {
    return { offset: this.offset, column: this.column, partialTab: this.#partialTab };
  }

  restore(snapshot: Snapshot): void {
    this.offset = snapshot.offset;
    this.column = snapshot.column;
    this.#partialTab = snapshot.partialTab;
  }
}
