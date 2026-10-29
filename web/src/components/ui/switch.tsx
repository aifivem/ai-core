import type { ComponentProps } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

/**
 * Dark Minimal toggle (docs/design.md): 4.2 x 2.4vh pill; on = accent fill with a white knob, off = raised with a
 * grey knob. Inner height 2.4 - 2 * 0.3 = 1.8vh = knob; travel 4.2 - 0.6 - 1.8 = 1.8vh. Hit area grows to 2.8vh.
 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[2.4vh] w-[4.2vh] shrink-0 cursor-pointer items-center rounded-full p-[0.3vh] transition-colors duration-150 before:absolute before:-inset-[0.2vh] before:content-[''] disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-accent data-[state=unchecked]:bg-raised",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-[1.8vh] rounded-full transition-[transform,background-color] duration-150 ease-out data-[state=checked]:bg-text data-[state=checked]:[transform:translateX(1.8vh)] data-[state=unchecked]:bg-text-3"
      />
    </SwitchPrimitive.Root>
  );
}
