import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { PlayersResult } from "../../../../../resource/common/adminPlayers";
import { cn } from "../../../lib/utils";
import { groupDigits } from "@aicore-fivem/lib/shared";

export type T = (key: string, ...args: Array<string | number>) => string;

/** A section card of the character screen (same look as the panel's setting cards). */
export function PCard({
  icon,
  title,
  desc,
  children,
  className,
}: {
  icon: IconDefinition;
  title: string;
  desc?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-[1.4vh] rounded-[1.2vh] bg-surface p-[1.6vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.07)]",
        className,
      )}
    >
      <header className="flex items-center gap-[1.4vh]">
        <span className="flex size-[4.2vh] shrink-0 items-center justify-center rounded-[0.8vh] bg-tgi-green-10 text-[1.7vh] text-tgi-green">
          <FontAwesomeIcon icon={icon} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-[0.5vh]">
          <h3 className="text-[1.6vh] leading-[1.2] font-semibold">{title}</h3>
          {desc && (
            <p className="text-[1.3vh] leading-[1.4] text-text-3">{desc}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/** The inset row list inside a card. */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-white/6 rounded-[1vh] bg-black/20 px-[1.6vh]">
      {children}
    </div>
  );
}

export function Row({
  label,
  children,
  mono,
}: {
  label: ReactNode;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-h-[4.6vh] items-center gap-[1.4vh] py-[0.8vh]">
      <span className="w-[16vh] shrink-0 truncate text-[1.35vh] text-text-3">
        {label}
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center justify-end gap-[0.8vh] text-right text-[1.35vh] text-text",
          mono && "font-mono text-[1.25vh] break-all",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Chip({
  tone,
  children,
}: {
  tone: "green" | "red" | "grey";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[2.2vh] shrink-0 items-center rounded-[0.4vh] px-[0.6vh] text-[1.1vh] font-bold uppercase",
        tone === "green" && "bg-tgi-green text-tgi-green-text",
        tone === "red" && "bg-danger-bg text-danger",
        tone === "grey" && "bg-white/8 text-text-2",
      )}
    >
      {children}
    </span>
  );
}

/** One action's state: busy while it runs, then the refusal or a short "done". */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const run = useCallback(
    async (work: () => Promise<PlayersResult>): Promise<boolean> => {
      setBusy(true);
      setNote(null);
      const result = await work();
      setBusy(false);
      setNote(
        result.ok
          ? { ok: true, text: "ADMIN_PLAYERS_DONE" }
          : { ok: false, text: result.error },
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNote(null), result.ok ? 2000 : 5000);
      return result.ok;
    },
    [],
  );
  return { busy, note, run };
}

export function Note({
  note,
  t,
}: {
  note: { ok: boolean; text: string } | null;
  t: T;
}) {
  if (!note) return null;
  return (
    <p
      role={note.ok ? "status" : "alert"}
      className={cn(
        "text-[1.25vh] leading-[1.4]",
        note.ok ? "text-tgi-green" : "text-danger",
      )}
    >
      {t(note.text)}
    </p>
  );
}

export const formatMoney = (n: number): string => groupDigits(n);
