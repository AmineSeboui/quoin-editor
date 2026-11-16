import * as React from "react";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";

const BASE =
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3";

const VARIANTS = {
  default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
  destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20 [a]:hover:bg-destructive/20",
  outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
};

type BadgeVariants = { variant?: keyof typeof VARIANTS };

/** Badge classes, for a control that should look like one, as the button the image's missing alt text marker is. */
const badgeVariants = ({ variant = "default", className }: BadgeVariants & { className?: string } = {}) =>
  cn(BASE, FOCUS_RING, VARIANTS[variant], className);

const Badge = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span"> & BadgeVariants>(
  function Badge({ className, variant = "default", ...props }, ref) {
    return <span ref={ref} data-slot="badge" data-variant={variant} className={badgeVariants({ variant, className })} {...props} />;
  },
);

export { Badge, badgeVariants };
