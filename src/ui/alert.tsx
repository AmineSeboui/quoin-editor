import * as React from "react";
import { cn } from "./cn";

const VARIANTS = {
  default: "bg-background text-foreground",
  destructive: "bg-background text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
};

type AlertProps = React.ComponentPropsWithoutRef<"div"> & { variant?: keyof typeof VARIANTS };

const Alert = /* @__PURE__ */ React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="alert"
      data-slot="alert"
      className={cn(
        "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-start text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});

const AlertTitle = /* @__PURE__ */ React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  function AlertTitle({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="alert-title"
        className={cn(
          "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

const AlertDescription = /* @__PURE__ */ React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  function AlertDescription({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="alert-description"
        className={cn(
          "text-sm text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Alert, AlertDescription, AlertTitle };
