// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readText, root } from './docs-sources.mjs';

const read = (path: string) => readText(join(root, path));
const markdownFiles = ['CHANGELOG.md', 'MIGRATION.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', '.github/pull_request_template.md'];
const forms = ['bug.yml', 'feature.yml', 'block-type.yml'].map((name) => `.github/ISSUE_TEMPLATE/${name}`);

describe('the community files', () => {
  it.each([...markdownFiles, ...forms, '.github/ISSUE_TEMPLATE/config.yml', '.github/dependabot.yml'])('include %s', (path) => {
    expect(existsSync(join(root, path))).toBe(true);
  });

  it.each([...markdownFiles, ...forms])('%s uses no em or en dash', (path) => {
    expect(read(path).match(/[\u2013\u2014]/g)).toBeNull();
  });

  it.each([...markdownFiles])('%s makes no claim the code cannot show', (path) => {
    expect(read(path)).not.toMatch(/fully accessible|exactly as written|wysiwyg/i);
  });

  it('ask contributors for no AI attribution lines and give the gate and the Linux container for Firefox', () => {
    const contributing = read('CONTRIBUTING.md');
    expect(contributing).toMatch(/attribution/i);
    expect(contributing).toContain('npm run check:consumer');
    expect(contributing).toContain('QUOIN_REACT=18');
    expect(contributing).toMatch(/mcr\.microsoft\.com\/playwright/);
  });

  it('adopt the Contributor Covenant 2.1', () => {
    expect(read('CODE_OF_CONDUCT.md')).toMatch(/Contributor Covenant[\s\S]*version 2\.1/);
  });

  it('send vulnerabilities to private reporting and support 1.x', () => {
    const security = read('SECURITY.md');
    expect(security).toMatch(/security\/advisories\/new/);
    expect(security).toMatch(/1\.x/);
  });

  it('write the issue templates as forms', () => {
    for (const path of forms) expect(read(path)).toMatch(/^body:/m);
  });

  it('send questions to the issue tracker, not to Discussions that may be off', () => {
    const config = read('.github/ISSUE_TEMPLATE/config.yml');
    expect(config).not.toMatch(/discussions/i);
    expect(config).toMatch(/blank_issues_enabled: true/);
    expect(config).toContain('https://github.com/AmineSeboui/quoin-editor/issues');
  });

  it('update npm weekly and actions monthly, in groups', () => {
    const dependabot = read('.github/dependabot.yml');
    expect(dependabot).toMatch(/package-ecosystem: npm[\s\S]*?interval: weekly/);
    expect(dependabot).toMatch(/package-ecosystem: github-actions[\s\S]*?interval: monthly/);
    expect(dependabot.match(/groups:/g)?.length).toBe(dependabot.match(/package-ecosystem:/g)?.length);
  });
});
