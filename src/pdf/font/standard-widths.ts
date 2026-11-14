// Advances in thousandths of an em, from Adobe's AFM files for the standard fonts, for each WinAnsiEncoding byte from
// 32 to 255: each character of a table is the index, in base 36, of that byte's width in its list of widths.
const HELVETICA_WIDTHS = [
  0, 191, 222, 260, 278, 333, 334, 350, 355, 365, 370, 389, 400, 469, 500, 537, 556, 584, 611, 667, 722, 737, 778, 833, 834,
  889, 944, 1000, 1015,
];
const HELVETICA =
  '448ggpj155bh4544gggggggggg44hhhgsjjkkjimk4ejgnkmjmkjikjqjji444dg5ggegg4gg22e2ngggg5e4gekeee636h0g02g5rgg5rj5r0i0022557gr5re5q0e' +
  'e45gggg3g5lagh5l5ch555gf4559goooijjjjjjrkjjjj4444kkmmmmmhmkkkkjjiggggggpegggg4444ggggggghiggggege';

const BOLD_WIDTHS = [
  0, 238, 278, 280, 333, 350, 365, 370, 389, 400, 474, 500, 556, 584, 611, 667, 722, 737, 778, 833, 834, 889, 944, 975, 1000,
];
const BOLD =
  '24acclg1448d2422cccccccccc44dddenggggfeig2cgejgifigfegfmffe424dc4cecec4ee22c2leeee8c4eciccb838d0c02cbocc4of4o0e0022bb5co4oc' +
  '4m0bc24cccc3c4h7cd4h49d444ec2446ckkkeggggggogffff2222ggiiiiidiggggffecccccclccccc2222eeeeeeedeeeeecec';

const COURIER_WIDTH = 600;

/** The advance of `byte` in a standard face, in thousandths of an em. */
export function standardWidth(family: 'helvetica' | 'courier', bold: boolean, byte: number): number {
  if (family === 'courier') return COURIER_WIDTH;
  const [widths, table] = bold ? [BOLD_WIDTHS, BOLD] : [HELVETICA_WIDTHS, HELVETICA];
  return widths[parseInt(table[byte - 32] ?? '0', 36)];
}
