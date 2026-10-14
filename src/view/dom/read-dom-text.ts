const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const OBJECT_REPLACEMENT = '\uFFFC';
const BLOCKS = new Set(['div', 'p']);

type Marker = 'atom' | 'break' | 'br' | 'block';
type Token = { kind: 'text'; data: string } | { kind: Marker };
type ElementKind = Marker | 'widget' | 'filler' | 'inline';

function kindOf(element: Element): ElementKind {
  if (element.hasAttribute('data-quoin-atom')) return 'atom';
  if (element.hasAttribute('data-quoin-widget')) return 'widget';
  if (element.localName === 'br') {
    if (element.hasAttribute('data-quoin-break')) return 'break';
    return element.hasAttribute('data-quoin-filler') ? 'filler' : 'br';
  }
  return BLOCKS.has(element.localName) ? 'block' : 'inline';
}

function collect(parent: Node, out: Token[]): void {
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === TEXT_NODE) {
      const data = (node as Text).data;
      if (data) out.push({ kind: 'text', data });
    } else if (node.nodeType === ELEMENT_NODE) {
      const kind = kindOf(node as Element);
      if (kind !== 'widget' && kind !== 'filler' && kind !== 'inline') out.push({ kind });
      if (kind === 'block' || kind === 'inline') collect(node, out);
    }
  }
}

// Reads the text a host holds the way the model counts it: one object replacement character per atom and one \n per
// line break. A browser br with nothing after it is the placeholder that keeps an empty line open, and a block the
// browser opened only ends the line when that line has something on it, so a block that follows a break does not add a
// second newline.
export function readDomText(host: HTMLElement): string {
  const tokens: Token[] = [];
  collect(host, tokens);
  let last = tokens.length - 1;
  while (last >= 0 && tokens[last].kind === 'block') last--;

  let result = '';
  let atLineStart = true;
  tokens.forEach((token, index) => {
    switch (token.kind) {
      case 'text':
        result += token.data;
        atLineStart = false;
        break;
      case 'atom':
        result += OBJECT_REPLACEMENT;
        atLineStart = false;
        break;
      case 'break':
      case 'br':
        if (token.kind === 'break' || index < last) {
          result += '\n';
          atLineStart = true;
        }
        break;
      case 'block':
        if (!atLineStart) {
          result += '\n';
          atLineStart = true;
        }
        break;
    }
  });
  return result;
}
