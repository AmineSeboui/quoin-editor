import * as React from "react";
import { cn } from "./cn";

const SIZES = { default: "gap-4 py-4", sm: "gap-3 py-3" };

type CardProps = React.ComponentPropsWithoutRef<"div"> & { size?: keyof typeof SIZES };

/** shadcn's card, on Quoin's popover surface, which is the colour shadcn's card token takes. */
const Card = /* @__PURE__ */ React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, size = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 forced-colors:border has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

export { Card };
