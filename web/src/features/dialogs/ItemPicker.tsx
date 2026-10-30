import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import type { PickerItem } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { VirtualList } from "../../components/VirtualList";
import { Input } from "../../components/ui/input";
import { ITEMS_MOCK } from "../../dev/dialogMock";

export interface ItemPickerData {
  title: string;
  items: PickerItem[];
  texts: { search: string; count: string; empty: string; hint: string };
}

const COLUMNS = 6;
const ITEMS_OPTIONS = { mockData: ITEMS_MOCK, mockDelay: 200 };
const pick = (name: string, count: number) =>
  void fetchNui(
    NuiCallback.dialogPickItem,
    { name, count },
    { mockData: true },
  );
const close = () =>
  void fetchNui(NuiCallback.dialogAnswer, { value: null }, { mockData: true });

/** One item: its picture (a box when the inventory has none) and name; a click takes `count` of it. */
function Tile({
  item,
  flash,
  onPick,
}: {
  item: PickerItem;
  flash: boolean;
  onPick: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      title={item.name}
      className={`flex aspect-square min-w-0 flex-col items-center justify-between rounded-[1vh] border p-[0.8vh] transition-[border-color,background-color] duration-150 outline-none hover:border-tgi-green-40 focus-visible:border-tgi-green-40 active:[transform:scale(0.97)] ${flash ? "border-tgi-green bg-tgi-green-10" : "border-white/8 bg-[#2222224D]"}`}
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

/** Admin tools' item picker (lib `itemPicker`): search, a count, every item as a picture tile; it stays open. */
export function ItemPicker() {
  const [data, setData] = useState<ItemPickerData | null>(null);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState("1");
  const [flash, setFlash] = useState<string | null>(null);

  useNuiEvent<ItemPickerData>(
    NuiMessage.itemsOpen,
    (d) => {
      setData(d);
      setSearch("");
    },
    ITEMS_OPTIONS,
  );
  useNuiEvent(NuiMessage.dialogClose, () => setData(null));

  useEffect(() => {
    if (!data) return;
    // Closes when Escape comes up: closing on the press hands the release to the game (pause menu).
    const up = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keyup", up);
    return () => window.removeEventListener("keyup", up);
  }, [data]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 400);
    return () => clearTimeout(t);
  }, [flash]);

  const rows = useMemo(() => {
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
  const amount = Math.max(1, Math.min(10_000, Math.floor(Number(count)) || 1));
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="fixed inset-0 m-auto flex h-[72vh] w-[84vh] flex-col gap-[1.2vh] rounded-[1.6vh] bg-panel p-[1.6vh]"
      aria-label={data.title}
    >
      <header className="flex items-center justify-between gap-[1vh] pl-[0.4vh]">
        <span className="truncate font-display text-[1.6vh] leading-none font-extrabold uppercase">
          {data.title}
        </span>
        <span className="flex h-[3vh] items-center rounded-full bg-control px-[1.2vh] text-[1.1vh] font-bold text-text-3">
          ESC
        </span>
      </header>
      <div className="flex gap-[1vh]">
        <label className="relative flex-1">
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
        <Input
          type="number"
          min={1}
          max={10000}
          value={count}
          aria-label={data.texts.count}
          title={data.texts.count}
          onChange={(e) => setCount(e.target.value)}
          className="w-[10vh] text-center"
        />
      </div>
      <VirtualList
        items={rows}
        estimateSize={13}
        gap={0.8}
        getItemKey={(row) => row[0]?.name ?? ""}
        className="min-h-0 flex-1 pr-[0.4vh]"
        empty={
          <p className="py-[4vh] text-center text-[1.3vh] text-text-3">
            {data.texts.empty}
          </p>
        }
        renderItem={(row) => (
          <div className="grid grid-cols-6 gap-[0.8vh]">
            {row.map((item) => (
              <Tile
                key={item.name}
                item={item}
                flash={flash === item.name}
                onPick={() => {
                  pick(item.name, amount);
                  setFlash(item.name);
                }}
              />
            ))}
          </div>
        )}
      />
      <p className="text-center text-[1.15vh] text-text-4">{data.texts.hint}</p>
    </motion.section>
  );
}
