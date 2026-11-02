import { Icon, type IconProps } from './Icon';

export const AlignCenter = (props: IconProps) => (
  <Icon name="align-center" {...props}>
    <path d="M21 5H3" />
    <path d="M17 12H7" />
    <path d="M19 19H5" />
  </Icon>
);

export const AlignJustify = (props: IconProps) => (
  <Icon name="align-justify" {...props}>
    <path d="M3 5h18" />
    <path d="M3 12h18" />
    <path d="M3 19h18" />
  </Icon>
);

export const AlignLeft = (props: IconProps) => (
  <Icon name="align-left" {...props}>
    <path d="M21 5H3" />
    <path d="M15 12H3" />
    <path d="M17 19H3" />
  </Icon>
);

export const AlignRight = (props: IconProps) => (
  <Icon name="align-right" {...props}>
    <path d="M21 5H3" />
    <path d="M21 12H9" />
    <path d="M21 19H7" />
  </Icon>
);

export const List = (props: IconProps) => (
  <Icon name="list" {...props}>
    <path d="M3 5h.01" />
    <path d="M3 12h.01" />
    <path d="M3 19h.01" />
    <path d="M8 5h13" />
    <path d="M8 12h13" />
    <path d="M8 19h13" />
  </Icon>
);

export const ListCollapse = (props: IconProps) => (
  <Icon name="list-collapse" {...props}>
    <path d="M10 5h11" />
    <path d="M10 12h11" />
    <path d="M10 19h11" />
    <path d="m3 10 3-3-3-3" />
    <path d="m3 20 3-3-3-3" />
  </Icon>
);

export const ListIndentDecrease = (props: IconProps) => (
  <Icon name="list-indent-decrease" {...props}>
    <path d="M21 5H11" />
    <path d="M21 12H11" />
    <path d="M21 19H11" />
    <path d="m7 8-4 4 4 4" />
  </Icon>
);

export const ListIndentIncrease = (props: IconProps) => (
  <Icon name="list-indent-increase" {...props}>
    <path d="M21 5H11" />
    <path d="M21 12H11" />
    <path d="M21 19H11" />
    <path d="m3 8 4 4-4 4" />
  </Icon>
);

export const ListOrdered = (props: IconProps) => (
  <Icon name="list-ordered" {...props}>
    <path d="M11 5h10" />
    <path d="M11 12h10" />
    <path d="M11 19h10" />
    <path d="M4 4h1v5" />
    <path d="M4 9h2" />
    <path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" />
  </Icon>
);

export const ListTodo = (props: IconProps) => (
  <Icon name="list-todo" {...props}>
    <path d="M13 5h8" />
    <path d="M13 12h8" />
    <path d="M13 19h8" />
    <path d="m3 17 2 2 4-4" />
    <rect x="3" y="4" width="6" height="6" rx="1" />
  </Icon>
);

export const Table = (props: IconProps) => (
  <Icon name="table" {...props}>
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </Icon>
);

export const TableOfContents = (props: IconProps) => (
  <Icon name="table-of-contents" {...props}>
    <path d="M16 5H3" />
    <path d="M16 12H3" />
    <path d="M16 19H3" />
    <path d="M21 5h.01" />
    <path d="M21 12h.01" />
    <path d="M21 19h.01" />
  </Icon>
);
