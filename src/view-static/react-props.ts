import { writtenAttrs, type Attr } from '../engine/render/html-node';

// React names these differently from HTML, and a server-rendered checkbox nobody toggles takes its initial state.
const PROP_NAMES: Readonly<Record<string, string>> = {
  class: 'className',
  checked: 'defaultChecked',
  referrerpolicy: 'referrerPolicy',
};

const camelCase = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

function styleObject(css: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of css.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) style[camelCase(declaration.slice(0, colon).trim())] = declaration.slice(colon + 1).trim();
  }
  return style;
}

/** The React props of an element's attributes, keeping the ones `toHTML` writes and no other. */
export function reactProps(attrs: readonly Attr[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, value] of writtenAttrs(attrs)) {
    props[PROP_NAMES[name] ?? name] = name === 'style' && value !== true ? styleObject(value) : value;
  }
  return props;
}
