import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { TabSpec } from "@aicore-fivem/shared";
import { cn } from "../../lib/utils";
import { goTo } from "./actions";
import { getAt } from "./path";

/** One record in a records tab's list: its label, key and `listSub` value; opens it. */
export function RecordRow({
  resource,
  tab,
  recordKey: key,
  record,
  label,
  active,
}: {
  resource: string;
  tab: TabSpec;
  recordKey: string;
  record: unknown;
  label: string;
  active: boolean;
}) {
  const sub = tab.listSub ? getAt(record, tab.listSub) : undefined;
  return (
    <button
      type="button"
      onClick={() => goTo(resource, tab.id, key)}
      className={cn(
        "flex min-h-[6.4vh] w-full items-center gap-[1.2vh] rounded-[0.9vh] px-[1.4vh] py-[1vh] text-left transition-[background-color] duration-150 ease-out",
        active
          ? "bg-tgi-green-15"
          : "bg-surface [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-[#202020]",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
        <span
          title={label}
          className={cn(
            "truncate text-[1.5vh] leading-[1.2] font-semibold",
            active && "text-tgi-green",
          )}
        >
          {label}
        </span>
        <span className="truncate text-[1.25vh] leading-[1.2] text-text-3">
          {typeof sub === "string" && sub ? `${key} · ${sub}` : key}
        </span>
      </span>
      <FontAwesomeIcon
        icon={faChevronRight}
        className={cn(
          "text-[1.2vh]",
          active ? "text-tgi-green" : "text-text-4",
        )}
        aria-hidden
      />
    </button>
  );
}
