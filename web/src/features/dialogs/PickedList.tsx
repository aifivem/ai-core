import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatWeight } from "@aicore-fivem/lib/shared";
import type { PickerItem } from "@aicore-fivem/shared";
import { VirtualList } from "../../components/VirtualList";
import { cn } from "../../lib/utils";

export interface Row {
  item: PickerItem;
  count: number;
}

/** A row's count: typed freely, applied on leave or Enter (the picker caps it at the weight limit). */
function CountBox({
  count,
  onCount,
}: {
  count: number;
  onCount: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(count));
  useEffect(() => setDraft(String(count)), [count]);
  const commit = () => {
    const n = Math.floor(Number(draft));
    if (Number.isFinite(n)) onCount(n);
    else setDraft(String(count));
  };
  return (
    <input
      value={draft}
      inputMode="numeric"
      aria-label="count"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="h-[3vh] w-[6vh] min-w-0 rounded-full border border-white/8 bg-[#2222224D] text-center text-[1.3vh] font-bold tabular-nums outline-none focus:border-tgi-green-40"
    />
  );
}

/** -10 / +10 next to the count. */
function StepButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[3vh] w-[3.6vh] shrink-0 items-center justify-center rounded-full bg-white/8 text-[1.1vh] font-bold text-text-2 tabular-nums transition-[background-color,color,transform] duration-150 ease-out enabled:hover:bg-white/14 enabled:hover:text-text enabled:active:[transform:scale(0.92)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/** The right side of the item picker: what will be taken, the counts, and the weight it adds. */
export function PickedList({
  rows,
  room,
  listWeight,
  texts,
  onCount,
  onAdd,
}: {
  rows: Row[];
  room: { weight: number; maxWeight: number } | null;
  listWeight: number;
  texts: { list: string; listEmpty: string; weight: string };
  onCount: (name: string, count: number) => void;
  /** +10: added like a Ctrl click on the tile (stops at the weight limit and says so). */
  onAdd: (row: Row, amount: number) => void;
}) {
  const total = (room?.weight ?? 0) + listWeight;
  const limited = room !== null && room.maxWeight > 0;
  const share = limited ? Math.min(1, total / room.maxWeight) : 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1vh] rounded-[1.2vh] bg-surface p-[1.2vh]">
      <span className="text-[1.2vh] font-semibold text-text-3 uppercase">
        {texts.list}
      </span>
      <VirtualList
        items={rows}
        estimateSize={4.6}
        gap={0.5}
        getItemKey={(r) => r.item.name}
        className="min-h-0 flex-1 pr-[0.4vh]"
        empty={
          <p className="px-[1vh] py-[3vh] text-center text-[1.25vh] text-text-4">
            {texts.listEmpty}
          </p>
        }
        renderItem={(r) => (
          <div className="flex h-[4.6vh] items-center gap-[1vh] rounded-[0.8vh] bg-white/4 px-[0.8vh]">
            <span className="flex size-[3.4vh] shrink-0 items-center justify-center">
              {r.item.image ? (
                <img
                  src={r.item.image}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <FontAwesomeIcon icon={faBox} className="text-white/20" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[1.3vh]">
              {r.item.label}
            </span>
            <div className="flex shrink-0 items-center gap-[0.4vh]">
              <StepButton
                label="-10"
                disabled={r.count <= 1}
                onClick={() => onCount(r.item.name, Math.max(1, r.count - 10))}
              />
              <CountBox
                count={r.count}
                onCount={(n) => onCount(r.item.name, n)}
              />
              <StepButton label="+10" onClick={() => onAdd(r, 10)} />
            </div>
            <button
              type="button"
              aria-label="remove"
              onClick={() => onCount(r.item.name, 0)}
              className="flex size-[3vh] items-center justify-center rounded-full text-[1.1vh] text-text-3 transition-colors duration-150 hover:bg-danger-bg hover:text-danger"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        )}
      />
      {limited && (
        <div className="flex flex-col gap-[0.5vh]">
          <div className="flex justify-between text-[1.15vh] text-text-3">
            <span>{texts.weight}</span>
            <span className="tabular-nums">
              {formatWeight(total)} / {formatWeight(room.maxWeight)}
            </span>
          </div>
          <div className="h-[0.6vh] overflow-hidden rounded-full bg-white/8">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-150",
                share >= 1 ? "bg-danger-solid" : "bg-tgi-green",
              )}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
