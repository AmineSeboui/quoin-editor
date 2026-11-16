import * as React from "react";
import { Check } from "../icons";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";

type CheckboxProps = Omit<React.ComponentPropsWithoutRef<"input">, "type">;

/** shadcn's checkbox drawn over a native input, which keeps the platform's semantics and keyboard. */
const Checkbox = /* @__PURE__ */ React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <span data-slot="checkbox-root" className="relative inline-flex size-4 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "peer size-4 shrink-0 appearance-none rounded-[4px] border border-input transition-colors group-has-disabled/field:opacity-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          FOCUS_RING,
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "checked:border-primary checked:bg-primary dark:checked:bg-primary forced-colors:appearance-auto",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 forced-colors:hidden"
      />
    </span>
  );
});

export { Checkbox };
