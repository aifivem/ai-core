import { Tabs as TabsPrimitive } from "radix-ui";
import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "../../lib/utils";

interface Tab<V extends string> {
  value: V;
  label: string;
  icon: IconDefinition;
}

interface TabBarProps<V extends string> {
  value: V;
  tabs: ReadonlyArray<Tab<V>>;
  onChange: (value: V) => void;
  /** Unique per screen: the sliding pill's motion id. */
  id: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * TGIANN header tabs (docs/design.md): equal-width `bg-control` tabs with icon + label, one green pill sliding to
 * the active one. Radix Tabs list only (arrow keys move between tabs); the content below is the caller's.
 */
export function TabBar<V extends string>({
  value,
  tabs,
  onChange,
  id,
  className,
  ...props
}: TabBarProps<V>) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(v) => {
        const tab = tabs.find((t) => t.value === v);
        if (tab) onChange(tab.value);
      }}
      activationMode="manual"
    >
      <TabsPrimitive.List
        aria-label={props["aria-label"]}
        className={cn("flex gap-[0.6vh]", className)}
      >
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "relative flex h-[4vh] w-[12.4vh] items-center justify-center gap-[0.8vh] rounded-[0.8vh] bg-control text-[1.3vh] font-medium transition-[background-color,color] duration-150 outline-none",
                active
                  ? "text-tgi-green-text"
                  : "text-text-2 hover:bg-control-hover hover:text-text focus-visible:bg-control-hover",
              )}
            >
              {active && (
                <motion.span
                  layoutId={id}
                  className="absolute inset-0 rounded-[0.8vh] bg-tgi-green"
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                />
              )}
              <FontAwesomeIcon
                icon={tab.icon}
                className="relative text-[1.25vh]"
                aria-hidden
              />
              <span className="relative">{tab.label}</span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
