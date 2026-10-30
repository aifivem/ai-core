import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faMagnifyingGlass,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { ItemPickerData, PickerItem } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { VirtualList } from "../../components/VirtualList";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ITEMS_MOCK } from "../../dev/dialogMock";
import { cn } from "../../lib/utils";
import { PickedList, type Row } from "./PickedList";

export interface ItemPickerMessage extends ItemPickerData {
  title: string;
  texts: {
    search: string;
    empty: string;
    hint: string;
    list: string;
    listEmpty: string;
    take: string;
    weight: string;
    heavy: string;
  };
}

const COLUMNS = 5;
const ITEMS_OPTIONS = { mockData: ITEMS_MOCK, mockDelay: 200 };
const answer = (value: unknown) =>
  void fetchNui(NuiCallback.dialogAnswer, { value }, { mockData: true });

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

/**
 * Admin tools' item picker (lib `itemPicker`): search and every item as a picture tile on the left, the list to take
 * on the right (click 1, Ctrl 10, Shift 100; counts editable), capped by the target's weight limit; Take sends it.
 */
export function ItemPicker() {
  const [data, setData] = useState<ItemPickerMessage | null>(null);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [flash, setFlash] = useState<{
    name: string;
    kind: "added" | "heavy";
  } | null>(null);

  useNuiEvent<ItemPickerMessage>(
    NuiMessage.itemsOpen,
    (d) => {
      setData(d);
      setSearch("");
      setRows([]);
    },
    ITEMS_OPTIONS,
  );
  useNuiEvent(NuiMessage.dialogClose, () => setData(null));

  useEffect(() => {
    if (!data) return;
    // Closes when Escape comes up: closing on the press hands the release to the game (pause menu).
    const up = (e: KeyboardEvent) => e.key === "Escape" && answer(null);
    window.addEventListener("keyup", up);
    return () => window.removeEventListener("keyup", up);
  }, [data]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 400);
    return () => clearTimeout(t);
  }, [flash]);

  const grid = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.items ?? []).filter(
      (i) =>
        !q ||
        i.label.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q),
    );
    const out: PickerItem[][] = [];
    for (let i = 0; i < list.length; i += COLUMNS)
      out.push(list.slice(i, i + COLUMNS));
    return out;
  }, [data, search]);

  if (!data) return null;
  const room = data.room;
  const listWeight = rows.reduce((sum, r) => sum + r.item.weight * r.count, 0);
  /** How many of `item` still fit next to the list without `except` (the row being edited). */
  const fitting = (item: PickerItem, except?: string): number => {
    if (!room || room.maxWeight <= 0 || item.weight <= 0) return 10_000;
    const others = rows.reduce(
      (sum, r) =>
        r.item.name === except ? sum : sum + r.item.weight * r.count,
      0,
    );
    return Math.max(
      0,
      Math.floor((room.maxWeight - room.weight - others) / item.weight),
    );
  };
  const add = (item: PickerItem, amount: number) => {
    const current = rows.find((r) => r.item.name === item.name)?.count ?? 0;
    const next = Math.min(current + amount, fitting(item, item.name), 10_000);
    setFlash({ name: item.name, kind: next > current ? "added" : "heavy" });
    if (next === current) return;
    setRows((list) =>
      current > 0
        ? list.map((r) =>
            r.item.name === item.name ? { ...r, count: next } : r,
          )
        : [...list, { item, count: next }],
    );
  };
  const setCount = (name: string, count: number) =>
    setRows((list) =>
      list.flatMap((r) =>
        r.item.name !== name
          ? [r]
          : count <= 0
            ? []
            : [{ ...r, count: Math.min(count, fitting(r.item, name)) }],
      ),
    );

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="fixed inset-0 m-auto flex h-[74vh] w-[118vh] flex-col gap-[1.2vh] rounded-[1.6vh] bg-panel p-[1.6vh]"
      aria-label={data.title}
    >
      <header className="flex items-center justify-between gap-[1vh] pl-[0.4vh]">
        <span className="truncate font-display text-[1.6vh] leading-none font-extrabold uppercase">
          {data.title}
        </span>
        <button
          type="button"
          onClick={() => answer(null)}
          className="flex h-[3vh] items-center gap-[0.6vh] rounded-full bg-control px-[1.2vh] text-[1.1vh] font-bold text-text-3 transition-colors duration-150 hover:text-text"
        >
          ESC <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 gap-[1.6vh]">
        <div className="flex min-w-0 flex-1 flex-col gap-[1vh]">
          <label className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute top-1/2 left-[1.4vh] [transform:translateY(-50%)] text-[1.3vh] text-text-4"
            />
            <Input
              autoFocus
              value={search}
              placeholder={data.texts.search}
              aria-label={data.texts.search}
              onChange={(e) => setSearch(e.target.value)}
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
                {data.texts.empty}
              </p>
            }
            renderItem={(row) => (
              <div className="grid grid-cols-5 gap-[0.8vh]">
                {row.map((item) => (
                  <Tile
                    key={item.name}
                    item={item}
                    flash={flash?.name === item.name ? flash.kind : null}
                    onPick={(amount) => add(item, amount)}
                  />
                ))}
              </div>
            )}
          />
          <p className="text-center text-[1.15vh] text-text-4">
            {flash?.kind === "heavy" ? (
              <span className="text-danger">{data.texts.heavy}</span>
            ) : (
              data.texts.hint
            )}
          </p>
        </div>
        <div className="flex w-[38vh] shrink-0 flex-col gap-[1vh]">
          <PickedList
            rows={rows}
            room={room}
            listWeight={listWeight}
            texts={data.texts}
            onCount={setCount}
          />
          <Button
            variant="primary"
            disabled={rows.length === 0}
            onClick={() =>
              answer(rows.map((r) => ({ name: r.item.name, count: r.count })))
            }
          >
            {data.texts.take}
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
