import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

// The drawings are Lucide's (ISC), copied so the package needs no icon library; THIRD_PARTY_NOTICES.md carries the
// licence.
export function Icon({ name, ...props }: IconProps & { name: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-quoin-icon={name}
      {...props}
    />
  );
}
