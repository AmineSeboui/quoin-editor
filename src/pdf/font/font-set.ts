import type { FaceUse } from './face';
import type { HostFace } from './host-face';
import { standardFace, type StandardName } from './standard-face';

export type HostFaces = { readonly regular?: HostFace; readonly bold?: HostFace; readonly italic?: HostFace; readonly mono?: HostFace };

export type FontStyle = { readonly bold: boolean; readonly italic: boolean; readonly mono: boolean };

/** Picks the face that draws each character of a style. */
export type FontSet = { use(codePoint: number, style: FontStyle): FaceUse | undefined };

function standardName({ bold, italic, mono }: FontStyle): StandardName {
  const suffix = bold && italic ? '-BoldOblique' : bold ? '-Bold' : italic ? '-Oblique' : '';
  return `${mono ? 'Courier' : 'Helvetica'}${suffix}` as StandardName;
}

// A host face of the style comes first, then the host's regular face with the style faked, then the standard face,
// which draws Latin text only. Code keeps to a monospaced face before it falls back to the regular one.
function chain(style: FontStyle, host: HostFaces, standard: (name: StandardName) => FaceUse): FaceUse[] {
  const uses: FaceUse[] = [];
  const add = (face: HostFace | undefined, bold = false, italic = false) => {
    if (face) uses.push({ face, fakeBold: style.bold && !bold, fakeItalic: style.italic && !italic });
  };
  if (style.mono) {
    add(host.mono);
    uses.push(standard(standardName(style)));
    add(host.regular);
    return uses;
  }
  if (style.bold) add(host.bold, true);
  else if (style.italic) add(host.italic, false, true);
  add(host.regular);
  uses.push(standard(standardName(style)));
  return uses;
}

export function fontSet(host: HostFaces): FontSet {
  const standards = new Map<StandardName, FaceUse>();
  const standard = (name: StandardName) => {
    let use = standards.get(name);
    if (!use) standards.set(name, (use = { face: standardFace(name), fakeBold: false, fakeItalic: false }));
    return use;
  };
  const chains = new Map<string, FaceUse[]>();
  return {
    use(codePoint, style) {
      const key = `${style.bold}${style.italic}${style.mono}`;
      let uses = chains.get(key);
      if (!uses) chains.set(key, (uses = chain(style, host, standard)));
      return uses.find(({ face }) => face.glyph(codePoint) !== undefined);
    },
  };
}
