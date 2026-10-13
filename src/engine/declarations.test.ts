import { existsSync } from 'node:fs';
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

describe.runIf(existsSync(declarations))('the built engine declarations', () => {
  it('type-check in a project that has no DOM types', () => {
    expect(declarationErrors(declarations)).toEqual([]);
  });
});
