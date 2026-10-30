import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/** TGIANN pill input (docs/design.md): faint fill, white/8 frame, green frame on focus, red when invalid. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-[3.6vh] w-full min-w-0 rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] text-[1.35vh] text-text [color-scheme:dark] transition-[border-color,background-color] duration-150 outline-none placeholder:text-text-4 hover:border-white/14 read-only:hover:border-white/8 focus:border-tgi-green-40 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
