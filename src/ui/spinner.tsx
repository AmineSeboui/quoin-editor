import { LoaderCircle, type IconProps } from "../icons";
import { cn } from "./cn";

/** shadcn's spinner, decorative: the words beside it, or the canvas live region, say what is happening. */
export function Spinner({ className, ...props }: IconProps) {
  return <LoaderCircle data-slot="spinner" aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />;
}
