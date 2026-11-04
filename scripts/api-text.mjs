import ts from 'typescript';

const ONE_LINE = 96;
const IMPORTED = /import\("[^"]*"\)\./g;

/** A type as one line, without the `import("...")` prefixes the checker writes for a type it reaches through a file. */
export const clean = (text) => text.replace(IMPORTED, '').replace(/\s+/g, ' ').trim();

export const typeText = (checker, node, type) =>
  clean(checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation));

const parameterText = (checker, parameter) => {
  const rest = parameter.dotDotDotToken ? '...' : '';
  const name = ts.isIdentifier(parameter.name) ? parameter.name.text : 'props';
  const optional = !rest && (parameter.questionToken || parameter.initializer) ? '?' : '';
  const type = parameter.type
    ? clean(parameter.type.getText())
    : typeText(checker, parameter, checker.getTypeAtLocation(parameter));
  return `${rest}${name}${optional}: ${type}`;
};

const typeParameters = (node) =>
  node.typeParameters?.length ? `<${node.typeParameters.map((parameter) => clean(parameter.getText())).join(', ')}>` : '';

const returnText = (checker, node) => {
  if (node.type) return clean(node.type.getText());
  const signature = checker.getSignatureFromDeclaration(node);
  return signature ? typeText(checker, node, signature.getReturnType()) : 'unknown';
};

/**
 * A callable as a reader needs to see it, on one line, or one parameter to a line when that line would run long. A
 * parameter the source gives a default is written optional, as the published types write it.
 */
export function callableText(checker, head, node, returns = returnText(checker, node)) {
  const parameters = node.parameters.map((parameter) => parameterText(checker, parameter));
  const opening = `${head}${typeParameters(node)}`;
  const tail = returns ? `: ${returns}` : '';
  const line = `${opening}(${parameters.join(', ')})${tail}`;
  if (line.length <= ONE_LINE || parameters.length < 2) return line;
  return `${opening}(\n${parameters.map((parameter) => `  ${parameter},`).join('\n')}\n)${tail}`;
}
