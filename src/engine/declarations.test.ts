import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const declarations = resolve(__dirname, '..', '..', 'dist', 'engine.d.ts');

function declarationErrors(file: string): string[] {
  const program = ts.createProgram([file], {
    lib: ['lib.es2022.d.ts'],
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    skipLibCheck: false,
    noEmit: true,
  });
  return ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

const isTypeDeclaration = (statement: ts.Statement) =>
  ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement);

// Types that an exported declaration mentions, directly or through other declarations, and the entry does not export.
// A function or constant that is only reached through `typeof` stays internal, since a host never has to name it.
function unexportedTypes(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);
  const declared = new Map<string, ts.Statement>();
  const exported = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) exported.add((element.propertyName ?? element.name).text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) declared.set(declaration.name.getText(), statement);
    } else if ('name' in statement && ts.isIdentifier(statement.name as ts.Node)) {
      declared.set((statement.name as ts.Identifier).text, statement);
    }
  }
  const reached = new Set<string>();
  const pending = [...exported].filter((name) => declared.has(name));
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (reached.has(name)) continue;
    reached.add(name);
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && declared.has(node.text)) pending.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(declared.get(name)!);
  }
  return [...reached].filter((name) => !exported.has(name) && isTypeDeclaration(declared.get(name)!)).sort();
}

describe.runIf(existsSync(declarations))('the built engine declarations', () => {
  it('type-check in a project that has no DOM types', () => {
    expect(declarationErrors(declarations)).toEqual([]);
  });

  it('export every type that a public declaration mentions', () => {
    expect(unexportedTypes(declarations)).toEqual([]);
  });
});
