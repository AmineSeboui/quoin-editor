import { str } from '../../blocks/data-fields';
import { ALERT_TONES } from '../block/alert';
import { quoteLines } from './line-format';

type Data = Record<string, unknown>;

const ALERT_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries(ALERT_TONES).map(([name, tone]) => [tone, name]),
);
const DELIMITERS: ReadonlyMap<unknown, string> = new Map([
  ['left', ':--'],
  ['center', ':-:'],
  ['right', '--:'],
]);
const MIN_FENCE = 3;
const FENCE_LIKE_MATH_LINE = /^ {0,3}\${2,}[ \t]*$/m;

export function calloutMarkdown(data: Data): string {
  const name = ALERT_NAMES.get(str(data.tone)) ?? 'NOTE';
  const body = str(data.body);
  return quoteLines(body === '' ? `[!${name}]` : `[!${name}]\n${body}`);
}

function longestRun(value: string, char: string): number {
  let longest = 0;
  let run = 0;
  for (const current of value) {
    run = current === char ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function codeMarkdown(data: Data): string {
  const code = str(data.code);
  const info = str(data.language);
  const char = info.includes('`') ? '~' : '`';
  const fence = char.repeat(Math.max(MIN_FENCE, longestRun(code, char) + 1));
  return [fence + info.replace(/[\\&]/g, '\\$&'), ...(code === '' ? [] : code.split('\n')), fence].join('\n');
}

export function mathMarkdown(data: Data): string | null {
  const latex = str(data.latex);
  if (FENCE_LIKE_MATH_LINE.test(latex)) return null;
  return ['$$', ...(latex === '' ? [] : latex.split('\n')), '$$'].join('\n');
}

const cellsOf = (row: unknown): string[] => (Array.isArray(row) ? row.map(str) : []);
const rowMarkdown = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;

export function tableMarkdown(data: Data): string | null {
  const rows = Array.isArray(data.rows) ? data.rows.map(cellsOf) : [];
  const cols = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  if (cols === 0) return null;
  const aligns = Array.isArray(data.align) ? data.align : [];
  const headed = data.header !== false;
  const header = headed ? rows[0] : [];
  const body = headed ? rows.slice(1) : rows;
  const pad = (cells: readonly string[]) => Array.from({ length: cols }, (_, col) => cells[col] ?? '');
  const delimiter = Array.from({ length: cols }, (_, col) => DELIMITERS.get(aligns[col]) ?? '---');
  return [header, delimiter, ...body].map((row) => rowMarkdown(pad(row))).join('\n');
}
