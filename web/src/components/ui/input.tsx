import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/** Dark Minimal text input: raised fill, 1px line, accent border on focus. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-[3.6vh] w-full min-w-0 rounded-[0.6vh] border border-line bg-raised px-[1.2vh] text-[1.3vh] text-text outline-none transition-colors duration-150 placeholder:text-text-3 hover:border-line-strong focus:border-accent aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
