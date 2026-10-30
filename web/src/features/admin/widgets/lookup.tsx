import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LookupOption, LookupSource } from "@aicore-fivem/shared";
import { Popover } from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";
import { useAppSelector } from "../../../store";

const MAX_SHOWN = 40;

/** The options of a lookup list, filtered by what is typed (label or value). */
export function useLookup(
  source: LookupSource,
  query: string,
): { options: LookupOption[]; all: LookupOption[] } {
  const all = useAppSelector((state) => state.admin.lookups[source]);
  const options = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const found = q
      ? all.filter(
          (o) =>
            o.label.toLocaleLowerCase().includes(q) ||
            o.value.toLocaleLowerCase().includes(q),
        )
      : all;
    return found.slice(0, MAX_SHOWN);
  }, [all, query]);
  return { options, all };
}

/**
 * A text box with an autocomplete list: only listed values can be picked (arrows move, Enter picks, Escape closes).
 * `anchor` renders the box (input or chip row) given the props the list needs.
 */
export function LookupBox({
  source,
  query,
  onQuery,
  onPick,
  empty,
  anchor,
  onEnterText,
}: {
  /** Enter with nothing listed: take the typed text as it is (addon model names). */
  onEnterText?: (text: string) => void;
  source: LookupSource;
  query: string;
  onQuery: (query: string) => void;
  onPick: (option: LookupOption) => void;
  empty: string;
  anchor: (input: {
    value: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { options } = useLookup(source, query);
  const pick = (option: LookupOption | undefined) => {
    if (!option) return;
    onPick(option);
    setOpen(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options.length === 0 && onEnterText && query.trim()) {
        onEnterText(query.trim());
        setOpen(false);
      } else pick(options[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      width="var(--radix-popper-anchor-width)"
      anchor={anchor({
        value: query,
        onChange: (value) => {
          onQuery(value);
          setActive(0);
          setOpen(true);
        },
        onFocus: () => setOpen(true),
        // A click on a row lands before the blur closes the list.
        onBlur: () => setTimeout(() => setOpen(false), 120),
        onKeyDown,
      })}
    >
      <div
        role="listbox"
        className="flex max-h-[32vh] min-w-[24vh] flex-col overflow-y-auto"
      >
        {options.length === 0 && (
          <p className="px-[1vh] py-[1vh] text-[1.25vh] text-text-3">{empty}</p>
        )}
        {options.map((option, i) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(option)}
            className={cn(
              "flex h-[3.4vh] shrink-0 items-center gap-[1vh] rounded-[0.6vh] px-[1vh] text-left",
              i === active ? "bg-white/8" : "",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[1.35vh]">
              {option.label}
            </span>
            <span className="shrink-0 font-mono text-[1.1vh] text-text-3">
              {option.value}
            </span>
          </button>
        ))}
      </div>
    </Popover>
  );
}
