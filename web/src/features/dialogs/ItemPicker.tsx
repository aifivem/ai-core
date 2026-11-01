import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PickerItem } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { ITEMS_MOCK } from "../../dev/dialogMock";
import { PickedList, type Row } from "./PickedList";
import { ItemGrid } from "./ItemGrid";
import type { ItemPickerMessage } from "./itemPickerMessage";

const COLUMNS = 5;
const ITEMS_OPTIONS = { mockData: ITEMS_MOCK, mockDelay: 200 };
const answer = (value: unknown) =>
  void fetchNui(NuiCallback.dialogAnswer, { value }, { mockData: true });
/**
 * Admin tools' item picker (lib `itemPicker`): search and every item as a picture tile on the left, the list to take
 * on the right (click 1, Ctrl 10, Shift 100; counts editable and -10 / +10 per row), capped by the target's weight
 * limit; Take sends it.
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
        <ItemGrid
          texts={data.texts}
          search={search}
          onSearch={setSearch}
          grid={grid}
          flash={flash}
          onPick={add}
        />
        <div className="flex w-[38vh] shrink-0 flex-col gap-[1vh]">
          <PickedList
            rows={rows}
            room={room}
            listWeight={listWeight}
            texts={data.texts}
            onCount={setCount}
            onAdd={(row, amount) => add(row.item, amount)}
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
