import type { KeyboardBind } from "../../../../resource/common/nui";
import { cn } from "../../lib/utils";
import type { KeyCap } from "./layout";

/** The keys screen's pieces: a key cap of the keyboard and an action row. */

/** One key unit in vh. */
export const U = 4.6;

export function Cap({
  cap,
  bound,
  active,
  onHover,
}: {
  cap: KeyCap;
  bound: boolean;
  active: boolean;
  onHover: (id: string) => void;
}) {
  const width = `${(cap.w ?? 1) * U}vh`;
  if (!cap.id) return <span style={{ width }} className="shrink-0" />;
  return (
    <span
      onMouseEnter={() => onHover(cap.id)}
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
export function BindRow({ bind }: { bind: KeyboardBind }) {
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
