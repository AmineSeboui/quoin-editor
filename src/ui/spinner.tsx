import { LoaderCircle } from "../icons";
import type { IconProps } from "../icons/Icon";
import { cn } from "./cn";

/** shadcn's spinner, decorative: the words beside it, or the canvas live region, say what is happening. */
export function Spinner({ className, ...props }: IconProps) {
  return <LoaderCircle data-slot="spinner" aria-hidden="true" className={cn("size-4 animate-spin motion-reduce:animate-none", className)} {...props} />;
}
