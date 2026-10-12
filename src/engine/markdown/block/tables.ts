import type { Align, TableNode } from './block-tree';
import { trimBlank } from './lines';
import { addChild, type BlockStart } from './parser-state';

const DELIMITER_CELL = /^:?-+:?$/;

// A line ending in a hard break backslash is paragraph text, never a header row.
function endsInHardBreak(line: string): boolean {
  let backslashes = 0;
  while (line[line.length - 1 - backslashes] === '\\') backslashes++;
  return backslashes % 2 === 1;
}

export function splitRow(line: string): string[] {
  const text = trimBlank(line);
  const cells: string[] = [];
  let cell = '';
  for (let at = 0; at < text.length; at++) {
    if (text[at] === '\\' && at + 1 < text.length) {
      cell += text[at] + text[at + 1];
      at++;
    } else if (text[at] === '|') {
      cells.push(cell);
      cell = '';
    } else {
      cell += text[at];
    }
  }
  cells.push(cell);
  if (text.startsWith('|')) cells.shift();
  if (cell === '' && text.endsWith('|')) cells.pop();
  return cells.map(trimBlank);
}

function alignOf(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (left) return 'left';
  return right ? 'right' : null;
}

function parseDelimiterRow(line: string): Align[] | null {
  if (!line.includes('|')) return null;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell)) ? cells.map(alignOf) : null;
}

export const tableStart: BlockStart = (parser, container) => {
  const { cursor } = parser;
  if (container.kind !== 'paragraph' || cursor.indented || container.lines.length === 0) return 'none';
  const headerLine = container.lines[container.lines.length - 1];
  const align = parseDelimiterRow(cursor.text);
  if (!align || endsInHardBreak(headerLine)) return 'none';
  const header = splitRow(headerLine);
  if (header.length !== align.length) return 'none';
  container.lines.pop();
  addChild(parser, { kind: 'table', align, header, rows: [] });
  return 'done';
};

export function addTableRow(table: TableNode, line: string): void {
  const cells = splitRow(line);
  table.rows.push(table.header.map((_, column) => cells[column] ?? ''));
}
