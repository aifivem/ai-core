import { useEffect, useMemo, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { VirtualList } from "../../components/VirtualList";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { jumpTo } from "./actions";
import { iconOf } from "./icons";
import { buildIndex, search, type SearchEntry } from "./searchIndex";

export const KIND_KEYS = {
  script: "ADMIN_SEARCH_SCRIPT",
  tab: "ADMIN_RESULT_TAB",
  field: "ADMIN_RESULT_SETTING",
  record: "ADMIN_SEARCH_RECORD",
} as const;

/** Search over every script's tabs, settings and records; Ctrl+K opens it, Enter or a click jumps there. */
export function GlobalSearch() {
  const panels = useAppSelector((s) => s.admin.panels);
  const texts = useAppSelector((s) => s.admin.texts);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(0);
  const t = (key: string) => texts[key] ?? key;
  const index = useMemo(
    () => (open ? buildIndex(panels, texts) : []),
    [open, panels, texts],
  );
  const results = useMemo(() => search(index, query), [index, query]);
  useEffect(() => setPicked(0), [results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    jumpTo(entry);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="group flex h-[4vh] w-[30vh] items-center gap-[1vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] text-[1.35vh] text-text-4 transition-colors duration-150 hover:border-white/14 hover:text-text-3 focus-visible:border-tgi-green-40 focus-visible:outline-none"
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="text-[1.3vh]"
            aria-hidden
          />
          <span className="flex-1 truncate text-left">
            {t("ADMIN_SEARCH_ALL")}
          </span>
          <span className="rounded-[0.4vh] bg-white/10 px-[0.5vh] py-[0.2vh] text-[1.05vh] text-text-3">
            Ctrl K
          </span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] animate-fade bg-black/60" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 top-[12vh] z-[91] mx-auto flex w-[72vh] animate-pop flex-col overflow-hidden rounded-[1.6vh] bg-panel [box-shadow:0_0_0_1px_rgba(255,255,255,0.1),inset_0_0.1vh_0_rgba(255,255,255,0.06),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]"
          // Escape closes the search first, not the whole panel.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setPicked(
                (i) =>
                  (i + step + results.length) % Math.max(1, results.length),
              );
            } else if (e.key === "Enter") go(results[picked]);
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {t("ADMIN_SEARCH_ALL")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("ADMIN_SEARCH_HINT")}
          </DialogPrimitive.Description>
          <label className="flex h-[6vh] items-center gap-[1.2vh] border-b border-white/8 px-[2vh]">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="text-[1.6vh] text-text-3"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ADMIN_SEARCH_HINT")}
              className="h-full flex-1 bg-transparent text-[1.6vh] text-text outline-none placeholder:text-text-4"
            />
          </label>
          <VirtualList
            className="max-h-[52vh] p-[0.8vh]"
            items={results}
            estimateSize={6}
            getItemKey={(e) =>
              `${e.kind}:${e.resource}:${e.tab}:${e.key ?? ""}:${e.path ?? ""}:${e.title}`
            }
            empty={
              <p className="px-[1.4vh] py-[2.4vh] text-center text-[1.35vh] text-text-3">
                {query.trim()
                  ? t("ADMIN_SEARCH_EMPTY").replace("{0}", query.trim())
                  : t("ADMIN_SEARCH_START")}
              </p>
            }
            renderItem={(e, i) => (
              <button
                type="button"
                onMouseMove={() => setPicked(i)}
                onClick={() => go(e)}
                className={cn(
                  "flex w-full items-center gap-[1.4vh] rounded-[1vh] px-[1.4vh] py-[1vh] text-left transition-colors duration-150",
                  i === picked ? "bg-tgi-green-15" : "hover:bg-white/5",
                )}
              >
                <span className="flex size-[3.4vh] shrink-0 items-center justify-center rounded-[0.8vh] bg-control text-text-2">
                  <FontAwesomeIcon
                    icon={iconOf(e.icon)}
                    className="text-[1.4vh]"
                    aria-hidden
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
                  <span className="truncate text-[1.45vh] font-medium text-text">
                    {e.title}
                  </span>
                  <span className="truncate text-[1.2vh] text-text-3">
                    {e.detail ? `${e.where} · ${e.detail}` : e.where}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-white/6 px-[1vh] py-[0.3vh] text-[1.1vh] text-text-3">
                  {t(KIND_KEYS[e.kind])}
                </span>
              </button>
            )}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
