import * as React from "react";
import { cn } from "./cn";

type AvatarProps = React.ComponentPropsWithoutRef<"span"> & { size?: "sm" | "default" | "lg" };

const Avatar = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, size = "default", ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className,
      )}
      {...props}
    />
  );
});

const AvatarImage = /* @__PURE__ */ React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<"img">>(
  function AvatarImage({ className, ...props }, ref) {
    return (
      <img
        ref={ref}
        data-slot="avatar-image"
        className={cn("aspect-square size-full rounded-full object-cover", className)}
        {...props}
      />
    );
  },
);

const AvatarFallback = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  function AvatarFallback({ className, ...props }, ref) {
    return (
      <span
        ref={ref}
        data-slot="avatar-fallback"
        className={cn(
          "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Avatar, AvatarFallback, AvatarImage };
