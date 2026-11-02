import { Icon, type IconProps } from './Icon';

export const ArrowDown = (props: IconProps) => (
  <Icon name="arrow-down" {...props}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Icon>
);

export const ArrowDownToLine = (props: IconProps) => (
  <Icon name="arrow-down-to-line" {...props}>
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 21H5" />
  </Icon>
);

export const ArrowLeft = (props: IconProps) => (
  <Icon name="arrow-left" {...props}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Icon>
);

export const ArrowLeftToLine = (props: IconProps) => (
  <Icon name="arrow-left-to-line" {...props}>
    <path d="M3 19V5" />
    <path d="m13 6-6 6 6 6" />
    <path d="M7 12h14" />
  </Icon>
);

export const ArrowRight = (props: IconProps) => (
  <Icon name="arrow-right" {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

export const ArrowRightToLine = (props: IconProps) => (
  <Icon name="arrow-right-to-line" {...props}>
    <path d="M17 12H3" />
    <path d="m11 18 6-6-6-6" />
    <path d="M21 5v14" />
  </Icon>
);

export const ArrowUp = (props: IconProps) => (
  <Icon name="arrow-up" {...props}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Icon>
);

export const ArrowUpToLine = (props: IconProps) => (
  <Icon name="arrow-up-to-line" {...props}>
    <path d="M5 3h14" />
    <path d="m18 13-6-6-6 6" />
    <path d="M12 7v14" />
  </Icon>
);

export const ChevronDown = (props: IconProps) => (
  <Icon name="chevron-down" {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronRight = (props: IconProps) => (
  <Icon name="chevron-right" {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const ChevronUp = (props: IconProps) => (
  <Icon name="chevron-up" {...props}>
    <path d="m18 15-6-6-6 6" />
  </Icon>
);

export const ExternalLink = (props: IconProps) => (
  <Icon name="external-link" {...props}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
);

export const Redo2 = (props: IconProps) => (
  <Icon name="redo-2" {...props}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
  </Icon>
);

export const Repeat2 = (props: IconProps) => (
  <Icon name="repeat-2" {...props}>
    <path d="m2 9 3-3 3 3" />
    <path d="M13 18H7a2 2 0 0 1-2-2V6" />
    <path d="m22 15-3 3-3-3" />
    <path d="M11 6h6a2 2 0 0 1 2 2v10" />
  </Icon>
);

export const SendHorizontal = (props: IconProps) => (
  <Icon name="send-horizontal" {...props}>
    <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z" />
    <path d="M6 12h16" />
  </Icon>
);

export const Undo2 = (props: IconProps) => (
  <Icon name="undo-2" {...props}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
  </Icon>
);
