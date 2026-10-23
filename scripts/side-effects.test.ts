// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { root } from './docs-sources.mjs';

const SOURCE = /\.tsx?$/;
const SKIPPED = /\.test\.tsx?$|\.d\.ts$|\/test-support\//;

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return SOURCE.test(entry.name) && !SKIPPED.test(path) ? [path] : [];
  });

const isDirective = (statement: ts.Statement) =>
  ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);

// A statement that runs when its module loads, beside declarations, imports and exports: what package.json's
// sideEffects would let a host's bundler drop with an import whose bindings go unused.
const runsAtLoad = (statement: ts.Statement) =>
  (ts.isExpressionStatement(statement) && !isDirective(statement)) ||
  ts.isIfStatement(statement) ||
  ts.isForStatement(statement) ||
  ts.isForOfStatement(statement) ||
  ts.isForInStatement(statement) ||
  ts.isWhileStatement(statement) ||
  ts.isTryStatement(statement) ||
  ts.isBlock(statement) ||
  (ts.isClassDeclaration(statement) &&
    statement.members.some((member) => ts.canHaveModifiers(member) && ts.getModifiers(member)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
    ) && !ts.isMethodDeclaration(member)));

it('runs no statement in any source module when it loads, so only the stylesheet has a side effect', () => {
  const files = sources(join(root, 'src'));
  expect(files.length).toBeGreaterThan(100);
  const found = files.flatMap((path) => {
    const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    return file.statements.filter(runsAtLoad).map((statement) => `${relative(root, path)}: ${statement.getText(file).slice(0, 80)}`);
  });
  expect(found).toEqual([]);
});
