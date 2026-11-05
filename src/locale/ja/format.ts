const LOCALE = 'ja';

const SIZE_UNITS = ['バイト', 'KB', 'MB', 'GB', 'TB'];

let moment: Intl.DateTimeFormat | undefined;
let names: Intl.ListFormat | undefined;

/** A number written as Japanese writes it, with `digits` decimals where it is given. */
export const number = (value: number, digits?: number): string =>
  value.toLocaleString(LOCALE, digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** A date and time as Japanese writes them, and the string itself when it is not a date. */
export const dateAndTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  moment ??= new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
  return moment.format(date);
};

/** Names joined as Japanese joins them. */
export const list = (values: readonly string[]): string =>
  (names ??= new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' })).format(values);

/** A size in bytes in binary units, with one decimal above bytes. */
export const size = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1023.95 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${number(value, unit === 0 ? undefined : 1)} ${SIZE_UNITS[unit]}`;
};
