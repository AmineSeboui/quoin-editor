const LOCALE = 'de';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

let plurals: Intl.PluralRules | undefined;
let moment: Intl.DateTimeFormat | undefined;
let names: Intl.ListFormat | undefined;

/** A number written as German writes it, with `digits` decimals where it is given. */
export const number = (value: number, digits?: number): string =>
  value.toLocaleString(LOCALE, digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** The form German takes for `count`, the plural where the set leaves that form out. */
export const plural = (count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>>): string =>
  forms[(plurals ??= new Intl.PluralRules(LOCALE)).select(count)] ?? forms.other ?? '';

/** A date and time as German writes them, and the string itself when it is not a date. */
export const dateAndTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  moment ??= new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
  return moment.format(date);
};

/** Names joined as German joins them: "Ada", "Ada und Alan", "Ada, Alan und Grace". */
export const list = (values: readonly string[]): string =>
  (names ??= new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' })).format(values);

/** A size in bytes in binary units, with one decimal above bytes: `0 B`, `1,5 KB`, `5,0 GB`. */
export const size = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1023.95 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${number(value, unit === 0 ? undefined : 1)} ${SIZE_UNITS[unit]}`;
};
