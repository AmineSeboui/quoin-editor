import ts from 'typescript';
import { callableText, clean, typeText } from './api-text.mjs';

const isPrivate = (member) =>
  member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword) ||
  (member.name !== undefined && ts.isPrivateIdentifier(member.name));

const readonly = (member) =>
  member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ? 'readonly ' : '';

const propertyText = (checker, member) => {
  const type = member.type
    ? clean(member.type.getText())
    : typeText(checker, member, checker.getTypeAtLocation(member));
  return `${readonly(member)}${member.name.getText()}: ${type}`;
};

const memberText = (checker, member) => {
  if (ts.isConstructorDeclaration(member)) return callableText(checker, 'constructor', member, '');
  if (ts.isMethodDeclaration(member)) return callableText(checker, member.name.getText(), member);
  if (ts.isGetAccessorDeclaration(member)) return callableText(checker, `get ${member.name.getText()}`, member);
  if (ts.isSetAccessorDeclaration(member)) return callableText(checker, `set ${member.name.getText()}`, member, '');
  if (ts.isPropertyDeclaration(member)) return propertyText(checker, member);
  return null;
};

/** A class as its own declaration, with the members a host can reach and without the bodies. */
export function classText(checker, name, declaration) {
  const heritage = declaration.heritageClauses?.map((clause) => clean(clause.getText())).join(' ');
  const members = declaration.members
    .filter((member) => !isPrivate(member))
    .map((member) => memberText(checker, member))
    .filter((text) => text !== null)
    .map((text) => `${text.replace(/\n/g, '\n  ')};`);
  const head = `class ${name}${heritage ? ` ${heritage}` : ''}`;
  return members.length === 0 ? head : `${head} {\n${members.map((member) => `  ${member}`).join('\n')}\n}`;
}
