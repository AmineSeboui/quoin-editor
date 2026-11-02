import { Icon, type IconProps } from './Icon';

export const Baseline = (props: IconProps) => (
  <Icon name="baseline" {...props}>
    <path d="M4 20h16" />
    <path d="m6 16 6-12 6 12" />
    <path d="M8 12h8" />
  </Icon>
);

export const Bold = (props: IconProps) => (
  <Icon name="bold" {...props}>
    <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
  </Icon>
);

export const CaseSensitive = (props: IconProps) => (
  <Icon name="case-sensitive" {...props}>
    <path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" />
    <path d="M22 9v7" />
    <path d="M3.304 13h6.392" />
    <circle cx="18.5" cy="12.5" r="3.5" />
  </Icon>
);

export const Code = (props: IconProps) => (
  <Icon name="code" {...props}>
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </Icon>
);

export const Heading1 = (props: IconProps) => (
  <Icon name="heading-1" {...props}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="m17 12 3-2v8" />
  </Icon>
);

export const Heading2 = (props: IconProps) => (
  <Icon name="heading-2" {...props}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
  </Icon>
);

export const Heading3 = (props: IconProps) => (
  <Icon name="heading-3" {...props}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
    <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
  </Icon>
);

export const Italic = (props: IconProps) => (
  <Icon name="italic" {...props}>
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </Icon>
);

export const Regex = (props: IconProps) => (
  <Icon name="regex" {...props}>
    <path d="M17 3v10" />
    <path d="m12.67 5.5 8.66 5" />
    <path d="m12.67 10.5 8.66-5" />
    <path d="M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z" />
  </Icon>
);

export const Strikethrough = (props: IconProps) => (
  <Icon name="strikethrough" {...props}>
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />
    <path d="M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" x2="20" y1="12" y2="12" />
  </Icon>
);

export const Subscript = (props: IconProps) => (
  <Icon name="subscript" {...props}>
    <path d="m4 5 8 8" />
    <path d="m12 5-8 8" />
    <path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07" />
  </Icon>
);

export const Superscript = (props: IconProps) => (
  <Icon name="superscript" {...props}>
    <path d="m4 19 8-8" />
    <path d="m12 19-8-8" />
    <path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06" />
  </Icon>
);

export const TextQuote = (props: IconProps) => (
  <Icon name="text-quote" {...props}>
    <path d="M17 5H3" />
    <path d="M21 12H8" />
    <path d="M21 19H8" />
    <path d="M3 12v7" />
  </Icon>
);

export const Type = (props: IconProps) => (
  <Icon name="type" {...props}>
    <path d="M12 4v16" />
    <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
    <path d="M9 20h6" />
  </Icon>
);

export const Underline = (props: IconProps) => (
  <Icon name="underline" {...props}>
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" x2="20" y1="20" y2="20" />
  </Icon>
);

export const WholeWord = (props: IconProps) => (
  <Icon name="whole-word" {...props}>
    <circle cx="7" cy="12" r="3" />
    <path d="M10 9v6" />
    <circle cx="17" cy="12" r="3" />
    <path d="M14 7v8" />
    <path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" />
  </Icon>
);
