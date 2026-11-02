import { Icon, type IconProps } from './Icon';

export const Droplet = (props: IconProps) => (
  <Icon name="droplet" {...props}>
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </Icon>
);

export const Keyboard = (props: IconProps) => (
  <Icon name="keyboard" {...props}>
    <path d="M10 8h.01" />
    <path d="M12 12h.01" />
    <path d="M14 8h.01" />
    <path d="M16 12h.01" />
    <path d="M18 8h.01" />
    <path d="M6 8h.01" />
    <path d="M7 16h10" />
    <path d="M8 12h.01" />
    <rect width="20" height="16" x="2" y="4" rx="2" />
  </Icon>
);

export const MessageSquare = (props: IconProps) => (
  <Icon name="message-square" {...props}>
    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
  </Icon>
);

export const MessageSquarePlus = (props: IconProps) => (
  <Icon name="message-square-plus" {...props}>
    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
    <path d="M12 8v6" />
    <path d="M9 11h6" />
  </Icon>
);

export const Palette = (props: IconProps) => (
  <Icon name="palette" {...props}>
    <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
  </Icon>
);

export const Radical = (props: IconProps) => (
  <Icon name="radical" {...props}>
    <path d="M3 12h3.28a1 1 0 0 1 .948.684l2.298 7.934a.5.5 0 0 0 .96-.044L13.82 4.771A1 1 0 0 1 14.792 4H21" />
  </Icon>
);

export const Sigma = (props: IconProps) => (
  <Icon name="sigma" {...props}>
    <path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2" />
  </Icon>
);

export const SmilePlus = (props: IconProps) => (
  <Icon name="smile-plus" {...props}>
    <path d="M13.267 2.08a10 10 0 108.653 8.653" />
    <path d="M15 10V9" />
    <path d="M16 5h6" />
    <path d="M16.472 15a6 6 0 01-8.943 0" />
    <path d="M19 2v6" />
    <path d="M9 10V9" />
  </Icon>
);

export const Sparkles = (props: IconProps) => (
  <Icon name="sparkles" {...props}>
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </Icon>
);

export const Sticker = (props: IconProps) => (
  <Icon name="sticker" {...props}>
    <path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
    <path d="M15 3v5a1 1 0 0 0 1 1h5" />
    <path d="M8 13h.01" />
    <path d="M16 13h.01" />
    <path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1" />
  </Icon>
);
