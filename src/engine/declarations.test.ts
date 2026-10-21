import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { describeBuilt, dist } from '../../test/support/built-dist';

const declarations = resolve(dist, 'engine.d.ts');

const OPTIONS: ts.CompilerOptions = {
  lib: ['lib.es2022.d.ts'],
  types: [],
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  skipLibCheck: false,
  noEmit: true,
};

function declarationErrors(file: string): string[] {
  const program = ts.createProgram([file], OPTIONS);
  return ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

const isTypeDeclaration = (node: ts.Declaration) =>
  ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node);

// Types that an exported declaration mentions, directly or through other declarations of the entry or of the chunks it
// imports from, and the entry does not export. A function or constant that is only reached through `typeof` stays
// internal, since a host never has to name it.
function unexportedTypes(file: string): string[] {
  const program = ts.createProgram([file], OPTIONS);
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(file)!;
  const built = (node: ts.Declaration) => dirname(node.getSourceFile().fileName) === dirname(entry.fileName);
  const original = (symbol: ts.Symbol) =>
    symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const exported = new Set(checker.getExportsOfModule(checker.getSymbolAtLocation(entry)!).map(original));
  const reached = new Set<ts.Symbol>();
  const pending = [...exported];
  for (let symbol = pending.pop(); symbol !== undefined; symbol = pending.pop()) {
    if (reached.has(symbol)) continue;
    reached.add(symbol);
    const visit = (node: ts.Node): void => {
      const target = ts.isIdentifier(node) ? checker.getSymbolAtLocation(node) : undefined;
      if (target !== undefined) pending.push(original(target));
      ts.forEachChild(node, visit);
    };
    symbol.declarations?.filter(built).forEach(visit);
  }
  const hidden = (symbol: ts.Symbol) =>
    !exported.has(symbol) && (symbol.declarations ?? []).some((node) => built(node) && isTypeDeclaration(node));
  return [...reached].filter(hidden).map((symbol) => symbol.name).sort();
}

describe('the unexported type finder', () => {
  it('follows an entry into the declaration chunks it imports from', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quoin-dts-'));
    try {
      const entry = join(dir, 'entry.d.ts');
      const chunk = 'interface Hidden { a: string }\ntype Shown = { hidden: Hidden };\nexport { type Shown as S };';
      writeFileSync(join(dir, 'chunk.d.ts'), chunk);
      const exports = "import { S as Shown } from './chunk.js';\ndeclare function make(): Shown;\nexport { make, type Shown };";
      writeFileSync(entry, exports);
      expect(unexportedTypes(entry)).toEqual(['Hidden']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describeBuilt('the built engine declarations', ['engine.d.ts'], () => {
  it('type-check in a project that has no DOM types', () => {
    expect(declarationErrors(declarations)).toEqual([]);
  });

  it('export every type that a public declaration mentions', () => {
    expect(unexportedTypes(declarations)).toEqual([]);
  });
});
