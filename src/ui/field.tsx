import * as React from "react";
import { cn } from "./cn";

const ORIENTATIONS = {
  vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
  horizontal:
    "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
};

type FieldProps = React.ComponentPropsWithoutRef<"div"> & { orientation?: keyof typeof ORIENTATIONS };

const Field = /* @__PURE__ */ React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, orientation = "vertical", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn("group/field flex w-full gap-2 data-[invalid=true]:text-destructive", ORIENTATIONS[orientation], className)}
      {...props}
    />
  );
});

const FieldLabel = /* @__PURE__ */ React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<"label">>(
  function FieldLabel({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        data-slot="field-label"
        className={cn(
          "group/field-label peer/field-label flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

const FieldDescription = /* @__PURE__ */ React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(
  function FieldDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        data-slot="field-description"
        className={cn(
          "text-start text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
          className,
        )}
        {...props}
      />
    );
  },
);

const FieldError = /* @__PURE__ */ React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  function FieldError({ className, children, ...props }, ref) {
    if (children === undefined || children === null || children === "") return null;
    return (
      <div
        ref={ref}
        role="alert"
        data-slot="field-error"
        className={cn("text-sm font-normal text-destructive", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

export { Field, FieldDescription, FieldError, FieldLabel };
