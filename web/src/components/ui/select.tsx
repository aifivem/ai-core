import { Select as SelectPrimitive } from "radix-ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string | undefined;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/** Radix select in Dark Minimal: raised trigger, floating list on `--panel-raised`, selected row in accent text. */
export function Select({ value, options, onChange, placeholder, className, ...props }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        aria-label={props["aria-label"]}
        className={cn(
          "flex h-[3.6vh] w-full items-center justify-between gap-[0.8vh] rounded-[0.6vh] border border-line bg-raised px-[1.2vh] text-[1.3vh] text-text transition-colors duration-150 hover:border-line-strong data-[placeholder]:text-text-3",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <FontAwesomeIcon icon={faChevronDown} className="text-[1.1vh] text-text-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-[40vh] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[0.8vh] border border-line bg-raised p-[0.4vh] [box-shadow:0_0.8vh_2.4vh_rgba(0,0,0,0.5)]"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex h-[3.2vh] cursor-pointer select-none items-center rounded-[0.6vh] pl-[3vh] pr-[1vh] text-[1.3vh] text-text-2 outline-none data-[highlighted]:bg-[rgba(255,255,255,0.06)] data-[state=checked]:text-accent"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-[1vh]">
                  <FontAwesomeIcon icon={faCheck} className="text-[1.1vh]" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
