import ts from 'typescript';
import { classText } from './api-members.mjs';
import { callableText, clean, typeText } from './api-text.mjs';

const written = (declaration) => declaration.getText().replace(/^export\s+/, '');

const variableText = (checker, name, symbol, declaration) => {
  const { initializer } = declaration;
  if (!declaration.type && initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
    return callableText(checker, `function ${name}`, initializer);
  }
  if (declaration.type) return `const ${name}: ${clean(declaration.type.getText())}`;
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const [call] = type.getCallSignatures();
  if (call) return `function ${name}${clean(checker.signatureToString(call, declaration, ts.TypeFormatFlags.NoTruncation))}`;
  return `const ${name}: ${typeText(checker, declaration, type)}`;
};

/** What an export declares: the shape a type is written as, or the signature a value is called through. */
export function signatureOf(checker, name, symbol, declaration) {
  if (ts.isFunctionDeclaration(declaration)) return callableText(checker, `function ${name}`, declaration);
  if (ts.isVariableDeclaration(declaration)) return variableText(checker, name, symbol, declaration);
  if (ts.isClassDeclaration(declaration)) return classText(checker, name, declaration);
  return written(declaration);
}
