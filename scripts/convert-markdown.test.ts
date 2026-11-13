// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';

const script = resolve(__dirname, 'convert-markdown.mjs');
const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

describeBuilt('the markdown conversion script', ['engine.js'], () => {
  let work: string;
  let docs: string;

  beforeEach(() => {
    work = mkdtempSync(join(tmpdir(), 'quoin-convert-'));
    docs = join(work, 'docs');
    mkdirSync(join(docs, 'guide'), { recursive: true });
    writeFileSync(join(docs, 'same.md'), '# Same\n\nText.\n');
    writeFileSync(join(docs, 'guide', 'star.markdown'), '---\ntitle: Star\n---\n\n* star\n');
    writeFileSync(join(docs, 'notes.txt'), '* not markdown\n');
  });

  afterEach(() => rmSync(work, { recursive: true, force: true }));

  it('reports what converted and exits 0 when nothing failed', () => {
    const { status, stdout } = run(docs, '--changes');
    expect(status).toBe(0);
    expect(stdout).toContain('Converted 2 markdown files');
    expect(stdout).toContain('  1 unchanged');
    expect(stdout).toContain('  1 changed');
    expect(stdout).toContain('  1 had front matter');
    expect(stdout).toContain(['  guide/star.markdown', '    line 5 read:    * star', '    line 5 written: - star'].join('\n'));
  });

  it('writes the blocks and the markdown they give back beside each other under --out', () => {
    const out = join(work, 'out');
    expect(run(docs, '--out', out).status).toBe(0);
    expect(readFileSync(join(out, 'guide', 'star.markdown'), 'utf8')).toBe('---\ntitle: Star\n---\n\n- star\n');
    const blocks = JSON.parse(readFileSync(join(out, 'guide', 'star.json'), 'utf8'));
    expect(blocks).toEqual([{ id: expect.any(String), type: 'MARKDOWN', data: { markdown: '- star' } }]);
    expect(existsSync(join(out, 'notes.txt'))).toBe(false);
  });

  it('refuses to write inside the directory it reads, and says how to run it', () => {
    const inside = run(docs, '--out', join(docs, 'out'));
    expect(inside.status).toBe(2);
    expect(inside.stderr).toContain('outside the directory it converts');
    const bare = run();
    expect(bare.status).toBe(2);
    expect(bare.stderr).toContain('Usage: npm run convert:markdown -- <directory>');
  });
});
