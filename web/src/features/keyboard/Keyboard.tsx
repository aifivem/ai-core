import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import {
  NuiCallback,
  NuiMessage,
  type KeyboardBind,
} from "../../../../resource/common/nui";
import { VirtualList } from "../../components/VirtualList";
import { KEYBOARD_MOCK } from "../../dev/keyboardMock";
import { cn } from "../../lib/utils";
import { keyId, ROWS, SIDE, type KeyCap } from "./layout";

export interface KeyboardData {
  binds: KeyboardBind[];
  texts: { title: string; hint: string; free: string; mouse: string };
}

/** One key unit in vh. */
const U = 4.6;
const OPTIONS = { mockData: KEYBOARD_MOCK, mockDelay: 200 };
const close = () =>
  void fetchNui(NuiCallback.keyboardClose, undefined, { mockData: true });

function Cap({
  cap,
  bound,
  active,
  onHover,
}: {
  cap: KeyCap;
  bound: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const width = `${(cap.w ?? 1) * U}vh`;
  if (!cap.id) return <span style={{ width }} className="shrink-0" />;
  return (
    <span
      onMouseEnter={() => onHover(cap.id)}
      onMouseLeave={() => onHover(null)}
      style={{ width }}
      className={cn(
        "flex h-[4.6vh] shrink-0 items-center justify-center rounded-[0.8vh] border text-[1.3vh] font-semibold transition-colors duration-150",
        active
          ? "border-tgi-green bg-tgi-green text-tgi-green-text"
          : bound
            ? "border-tgi-green-40 bg-tgi-green-15 text-tgi-green"
            : "border-white/8 bg-[#2222224D] text-text-3",
      )}
    >
      {cap.label}
    </span>
  );
}

/** One action row: its key cap and what it does. */
function BindRow({ bind }: { bind: KeyboardBind }) {
  return (
    <div className="flex h-[3.6vh] items-center gap-[1.2vh] rounded-[0.8vh] bg-surface px-[1vh]">
      <span className="flex h-[2.6vh] min-w-[2.6vh] items-center justify-center rounded-[0.5vh] bg-tgi-green px-[0.6vh] text-[1.1vh] font-bold text-tgi-green-text">
        {bind.key}
      </span>
      <span className="min-w-0 flex-1 truncate text-[1.3vh] text-text">
        {bind.label}
      </span>
      <span className="shrink-0 text-[1.1vh] text-text-4">{bind.resource}</span>
    </div>
  );
}

/**
 * The keys screen (radial menu, Keys): a keyboard with every key that has an action coloured; pointing at a key lists
 * its actions underneath, otherwise every action is listed. Escape closes it.
 */
export function Keyboard() {
  const [data, setData] = useState<KeyboardData | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  useNuiEvent<KeyboardData>(NuiMessage.keyboardOpen, setData, OPTIONS);
  useNuiEvent(NuiMessage.keyboardClose, () => setData(null));

  useEffect(() => {
    if (!data) return;
    // Closes when Escape comes up: closing on the press hands the release to the game (pause menu).
    const up = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keyup", up);
    return () => window.removeEventListener("keyup", up);
  }, [data]);

  const byKey = useMemo(() => {
    const map = new Map<string, KeyboardBind[]>();
    for (const b of data?.binds ?? []) {
      if (b.mouse) continue;
      const id = keyId(b.key);
      map.set(id, [...(map.get(id) ?? []), b]);
    }
    return map;
  }, [data]);
  const sorted = useMemo(
    () =>
      [...(data?.binds ?? [])].sort(
        (a, b) => a.key.localeCompare(b.key) || a.label.localeCompare(b.label),
      ),
    [data],
  );

  if (!data) return null;
  const shown = hovered ? (byKey.get(hovered) ?? []) : sorted;
  const row = (caps: KeyCap[], i: number) => (
    <div key={i} className="flex h-[4.6vh] gap-[0.5vh]">
      {caps.map((cap, j) => (
        <Cap
          key={`${cap.id}${j}`}
          cap={cap}
          bound={byKey.has(cap.id)}
          active={hovered === cap.id}
          onHover={setHovered}
        />
      ))}
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 flex flex-col items-center justify-center gap-[2.4vh] bg-black/60"
    >
      <header className="flex flex-col items-center gap-[0.6vh]">
        <h1 className="font-display text-[2.6vh] leading-none font-extrabold uppercase">
          {data.texts.title}
        </h1>
        <p className="text-[1.3vh] text-text-3">{data.texts.hint}</p>
      </header>
      <div className="flex gap-[2vh] rounded-[1.6vh] bg-panel p-[1.6vh]">
        <div className="flex flex-col gap-[0.5vh]">{ROWS.map(row)}</div>
        <div className="flex flex-col gap-[0.5vh]">{SIDE.map(row)}</div>
      </div>
      <div className="flex h-[26vh] w-[92vh] flex-col gap-[0.8vh] rounded-[1.6vh] bg-panel p-[1.2vh]">
        {hovered && shown.length === 0 ? (
          <p className="py-[2vh] text-center text-[1.3vh] text-text-3">
            {data.texts.free}
          </p>
        ) : (
          <VirtualList
            items={shown}
            estimateSize={3.6}
            gap={0.5}
            getItemKey={(b) => b.name}
            className="min-h-0 flex-1 pr-[0.4vh]"
            renderItem={(b) => <BindRow bind={b} />}
          />
        )}
      </div>
    </motion.div>
  );
}
