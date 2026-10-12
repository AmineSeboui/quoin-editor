export type LineKind = 'paragraph' | 'heading' | 'bullet' | 'ordered' | 'task' | 'quote';

export type LineAttrs = { kind: LineKind; level?: number; checked?: boolean; start?: number };

export type ParsedLine = LineAttrs & { rest: string };

const INDENT = /^ {0,3}/;
const TASK = /^[-*+] \[([ xX])\](?: |$)/;
const HEADING = /^(#{1,6})(?: +|$)/;
const CLOSING_SEQUENCE = / +#+ *$/;
const BULLET = /^[-*+](?: |$)/;
const ORDERED = /^(\d{1,9})[.)](?: |$)/;
const QUOTE = /^> ?/;

export function parseLine(markdown: string): ParsedLine {
  const line = markdown.replace(INDENT, '');
  const after = (match: RegExpExecArray) => line.slice(match[0].length);

  const task = TASK.exec(line);
  if (task) return { kind: 'task', checked: task[1] !== ' ', rest: after(task) };
  const heading = HEADING.exec(line);
  if (heading) {
    return { kind: 'heading', level: heading[1].length, rest: after(heading).replace(CLOSING_SEQUENCE, '') };
  }
  const bullet = BULLET.exec(line);
  if (bullet) return { kind: 'bullet', rest: after(bullet) };
  const ordered = ORDERED.exec(line);
  if (ordered) return { kind: 'ordered', start: Number(ordered[1]), rest: after(ordered) };
  const quote = QUOTE.exec(line);
  if (quote) return { kind: 'quote', rest: after(quote) };
  return { kind: 'paragraph', rest: markdown };
}

export function linePrefix({ kind, level, checked, start }: LineAttrs): string {
  switch (kind) {
    case 'heading':
      return `${'#'.repeat(Math.min(6, Math.max(1, level ?? 1)))} `;
    case 'bullet':
      return '- ';
    case 'ordered':
      return `${start ?? 1}. `;
    case 'task':
      return checked ? '- [x] ' : '- [ ] ';
    case 'quote':
      return '> ';
    default:
      return '';
  }
}
