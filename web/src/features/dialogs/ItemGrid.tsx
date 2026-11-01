import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import type { PickerItem } from "@aicore-fivem/shared";
import { VirtualList } from "../../components/VirtualList";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import type { ItemPickerMessage } from "./itemPickerMessage";

/** One item: its picture (a box when the inventory has none) and name. */
function Tile({
  item,
  flash,
  onPick,
}: {
  item: PickerItem;
  flash: "added" | "heavy" | null;
  onPick: (amount: number) => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => onPick(e.shiftKey ? 100 : e.ctrlKey ? 10 : 1)}
      title={item.name}
      className={cn(
        "flex aspect-square min-w-0 flex-col items-center justify-between rounded-[1vh] border p-[0.8vh] transition-[border-color,background-color] duration-150 outline-none hover:border-tgi-green-40 focus-visible:border-tgi-green-40 active:[transform:scale(0.97)]",
        flash === "added"
          ? "border-tgi-green bg-tgi-green-10"
          : flash === "heavy"
            ? "border-danger bg-danger-bg"
            : "border-white/8 bg-[#2222224D]",
      )}
    >
      <span className="flex min-h-0 w-full flex-1 items-center justify-center">
        {item.image && !broken ? (
          <img
            src={item.image}
            alt=""
            draggable={false}
            onError={() => setBroken(true)}
            className="max-h-[6vh] max-w-[80%] object-contain"
          />
        ) : (
          <FontAwesomeIcon icon={faBox} className="text-[3vh] text-white/20" />
        )}
      </span>
      <span className="w-full truncate text-center text-[1.15vh] text-text-2">
        {item.label}
      </span>
    </button>
  );
}

/** The picker's left column: the search box, every item as a tile (rows of five) and the hint line. */
export function ItemGrid({
  texts,
  search,
  onSearch,
  grid,
  flash,
  onPick,
}: {
  texts: ItemPickerMessage["texts"];
  search: string;
  onSearch: (search: string) => void;
  grid: PickerItem[][];
  flash: { name: string; kind: "added" | "heavy" } | null;
  onPick: (item: PickerItem, amount: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[1vh]">
      <label className="relative">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="pointer-events-none absolute top-1/2 left-[1.4vh] [transform:translateY(-50%)] text-[1.3vh] text-text-4"
        />
        <Input
          autoFocus
          value={search}
          placeholder={texts.search}
          aria-label={texts.search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-[3.6vh]"
        />
      </label>
      <VirtualList
        items={grid}
        estimateSize={14}
        gap={0.8}
        getItemKey={(row) => row[0]?.name ?? ""}
        className="min-h-0 flex-1 pr-[0.4vh]"
        empty={
          <p className="py-[4vh] text-center text-[1.3vh] text-text-3">
            {texts.empty}
          </p>
        }
        renderItem={(row) => (
          <div className="grid grid-cols-5 gap-[0.8vh]">
            {row.map((item) => (
              <Tile
                key={item.name}
                item={item}
                flash={flash?.name === item.name ? flash.kind : null}
                onPick={(amount) => onPick(item, amount)}
              />
            ))}
          </div>
        )}
      />
      <p className="text-center text-[1.15vh] text-text-4">
        {flash?.kind === "heavy" ? (
          <span className="text-danger">{texts.heavy}</span>
        ) : (
          texts.hint
        )}
      </p>
    </div>
  );
}
