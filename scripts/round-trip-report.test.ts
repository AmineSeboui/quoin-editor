// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exitCode, roundTripReport, type FileResult } from './round-trip-report.mjs';

const results: FileResult[] = [
  { path: 'a.md', status: 'unchanged', frontMatter: null, ms: 2 },
  { path: 'docs/b.md', status: 'changed', frontMatter: '---\nx: 1\n---\n', ms: 31, difference: { line: 4, source: '* b', written: '- b' } },
  { path: 'c.md', status: 'changed', frontMatter: null, ms: 5, difference: { line: 9, source: 'end', written: null } },
  {
    path: 'd.md',
    status: 'failed',
    frontMatter: null,
    ms: 1,
    error: 'reads back differently once written',
    difference: { line: 1, source: '> - a', written: '> a' },
    redrawn: { block: 2, converted: '{"indent":1}', readBack: '{}' },
  },
  { path: 'e.md', status: 'failed', frontMatter: null, ms: 1, error: 'no parse' },
];

describe('the round trip report', () => {
  it('counts each outcome, the files with front matter, and names the slowest file', () => {
    expect(roundTripReport(results, { seconds: 1.234 }).split('\n').slice(0, 6)).toEqual([
      'Converted 5 markdown files in 1.2 s.',
      '  1 unchanged: written back exactly as read',
      '  2 changed: written back differently, and reading that back gives the same document',
      '  2 failed: the conversion threw, or what it wrote reads back to a different document',
      '  1 had front matter, set aside before converting and put back on top',
      'Slowest: docs/b.md, 31 ms',
    ]);
  });

  it('lists every failed file with its reason and the first block that reads back differently', () => {
    expect(roundTripReport(results, { seconds: 1 })).toContain(
      [
        'Failed:',
        '  d.md: reads back differently once written',
        '    block 2 converted: {"indent":1}',
        '    block 2 read back: {}',
        '  e.md: no parse',
      ].join('\n'),
    );
  });

  it('lists the changed files only when asked, saying where a file ended', () => {
    expect(roundTripReport(results, { seconds: 1 })).not.toContain('Changed:');
    expect(roundTripReport(results, { seconds: 1, changes: true })).toContain(
      [
        'Changed:',
        '  docs/b.md',
        '    line 4 read:    * b',
        '    line 4 written: - b',
        '  c.md',
        '    line 9 read:    end',
        '    line 9 written: (nothing, the file ends)',
      ].join('\n'),
    );
  });

  it('counts thousands with separators', () => {
    const many = Array.from({ length: 1234 }, (_, at): FileResult => ({ path: `${at}.md`, status: 'unchanged', frontMatter: null, ms: 1 }));
    expect(roundTripReport(many, { seconds: 2 })).toMatch(/^Converted 1,234 markdown files in 2\.0 s\.\n {2}1,234 unchanged/);
  });

  it('says so when it found no markdown at all', () => {
    expect(roundTripReport([], { seconds: 0 })).toBe('Found no markdown files (.md or .markdown).');
  });
});

describe('the exit code', () => {
  it('is 1 when a file failed and 0 when every file converted, changed or not', () => {
    expect(exitCode(results)).toBe(1);
    expect(exitCode(results.slice(0, 3))).toBe(0);
    expect(exitCode(results.slice(4))).toBe(1);
  });
});
