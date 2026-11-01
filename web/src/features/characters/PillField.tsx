import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export const BUBBLE =
  "flex size-[3.7vh] shrink-0 items-center justify-center rounded-full bg-black/20 text-[1.7vh] text-tgi-green";

/** Rounded field of the form (tgiann-multichar PillField): icon bubble left, green frame while focused, red while invalid. */
export function PillField({
  icon,
  invalid,
  children,
}: {
  icon: ReactNode;
  invalid: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-[4.7vh] min-w-0 flex-1 items-center gap-[1vh] rounded-full border bg-white/3 p-[0.5vh] transition-[border-color] duration-150",
        invalid
          ? "border-danger"
          : "border-white/10 focus-within:border-tgi-green-60",
      )}
    >
      <span className={BUBBLE}>{icon}</span>
      {children}
    </div>
  );
}

/** The text box inside a `PillField`. */
export const INPUT =
  "h-full min-w-0 flex-1 bg-transparent pr-[1.4vh] text-[1.6vh] text-tgi-green outline-none [color-scheme:dark] placeholder:text-white/40";
