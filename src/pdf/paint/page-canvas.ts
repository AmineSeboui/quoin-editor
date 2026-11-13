import { pdfName, pdfNumber } from '../file/pdf-syntax';
import type { LinkTarget, Rgb } from '../text/text-style';
import type { Resources } from './resources';

export type LinkArea = { readonly rect: readonly [number, number, number, number]; readonly target: LinkTarget };

/**
 * One page's drawing, in points from its top left corner. What is painted `behind` goes under everything else, so a
 * frame known only once the page is full still sits under the text it holds.
 */
export type PageCanvas = {
  readonly resources: Resources;
  readonly links: LinkArea[];
  /** The distance of `top` from the bottom of the page, where PDF measures from. */
  y(top: number): number;
  write(operators: string): void;
  fillRect(x: number, top: number, width: number, height: number, color: Rgb): void;
  strokeRect(x: number, top: number, width: number, height: number, color: Rgb, lineWidth: number): void;
  line(points: readonly (readonly [number, number])[], color: Rgb, lineWidth: number): void;
  disc(x: number, top: number, radius: number, color: Rgb, filled: boolean): void;
  image(name: string, x: number, top: number, width: number, height: number): void;
  link(x: number, top: number, width: number, height: number, target: LinkTarget): void;
  behind(paint: () => void): void;
  content(): string;
};

const numbers = (...values: number[]) => values.map(pdfNumber).join(' ');

export const fillColor = (color: Rgb): string => `${numbers(...color)} rg`;

export const strokeColor = (color: Rgb): string => `${numbers(...color)} RG`;

// The control points of a quarter circle drawn as a cubic curve sit this far along its tangents, in radii.
const KAPPA = 0.5523;

export function createCanvas(pageHeight: number, resources: Resources): PageCanvas {
  const front: string[] = [];
  const back: string[] = [];
  let out = front;
  const links: LinkArea[] = [];
  const y = (top: number) => pageHeight - top;
  const write = (operators: string) => void out.push(operators);
  return {
    resources,
    links,
    y,
    write,
    fillRect: (x, top, width, height, color) => write(`${fillColor(color)} ${numbers(x, y(top + height), width, height)} re f`),
    strokeRect: (x, top, width, height, color, lineWidth) =>
      write(`${strokeColor(color)} ${pdfNumber(lineWidth)} w ${numbers(x, y(top + height), width, height)} re S`),
    line(points, color, lineWidth) {
      const path = points.map(([x, top], at) => `${numbers(x, y(top))} ${at === 0 ? 'm' : 'l'}`).join(' ');
      write(`q ${strokeColor(color)} ${pdfNumber(lineWidth)} w 1 J 1 j ${path} S Q`);
    },
    disc(x, top, radius, color, filled) {
      const [cx, cy, k] = [x, y(top), radius * KAPPA];
      const curve = (...points: number[]) => `${numbers(...points)} c`;
      const path = [
        `${numbers(cx + radius, cy)} m`,
        curve(cx + radius, cy + k, cx + k, cy + radius, cx, cy + radius),
        curve(cx - k, cy + radius, cx - radius, cy + k, cx - radius, cy),
        curve(cx - radius, cy - k, cx - k, cy - radius, cx, cy - radius),
        curve(cx + k, cy - radius, cx + radius, cy - k, cx + radius, cy),
      ].join(' ');
      write(filled ? `${fillColor(color)} ${path} f` : `${strokeColor(color)} ${pdfNumber(radius / 3)} w ${path} S`);
    },
    image: (name, x, top, width, height) => write(`q ${numbers(width, 0, 0, height, x, y(top + height))} cm ${pdfName(name)} Do Q`),
    link: (x, top, width, height, target) => void links.push({ rect: [x, y(top + height), x + width, y(top)], target }),
    behind(paint) {
      out = back;
      paint();
      out = front;
    },
    content: () => [...back, ...front].join('\n'),
  };
}
