import { relative, resolve } from 'node:path';
import ts from 'typescript';
import { signatureOf } from './api-signature.mjs';

/**
 * A name an entry of the package exports, read from the declaration it points at.
 * @typedef {{ name: string, doc: string, deprecated: string, signature: string, file: string, line: number }} ApiExport
 */

const aliased = (checker, symbol) =>
  symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** What `@deprecated` says, which the documentation comment leaves out because it is a tag rather than prose. */
function deprecation(checker, symbol) {
  const tag = symbol.getJsDocTags(checker).find(({ name }) => name === 'deprecated');
  return tag ? ts.displayPartsToString(tag.text).trim() : '';
}

/** Alphabetical, whatever the machine's collation, and a type before the value of the same name in lower case. */
const byName = (a, b) => order(a.name.toLowerCase(), b.name.toLowerCase()) || order(a.name, b.name);

function read(root, checker, symbol) {
  const name = symbol.getName();
  const target = aliased(checker, symbol);
  const declaration = target.declarations?.[0];
  if (!declaration) throw new Error(`${name} is exported but declares nothing the reference can read`);
  const source = declaration.getSourceFile();
  return {
    name,
    doc: ts.displayPartsToString(target.getDocumentationComment(checker)).trim(),
    deprecated: deprecation(checker, target),
    signature: signatureOf(checker, name, target, declaration),
    file: relative(root, source.fileName),
    line: source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
  };
}

/**
 * Every name the given entry sources export, by entry name, in alphabetical order.
 * @param {string} root
 * @param {{ name: string, source: string }[]} entries
 * @returns {Map<string, ApiExport[]>}
 */
export function readEntries(root, entries) {
  const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const files = entries.map(({ source }) => resolve(root, source));
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  return new Map(
    entries.map(({ name, source }, index) => {
      const file = program.getSourceFile(files[index]);
      if (!file) throw new Error(`no ${source} to read the exports of ${name} from`);
      const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(file));
      return [name, exports.map((symbol) => read(root, checker, symbol)).sort(byName)];
    }),
  );
}
