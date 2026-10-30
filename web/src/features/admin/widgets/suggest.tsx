import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { Popover } from "../../../components/ui/popover";
import { Tooltip } from "../../../components/ui/tooltip";
import { placeNames, type Point } from "../actions";
import { useEditor } from "../context";
import { getAt } from "../path";

const isPointValue = (v: unknown): v is Point =>
  typeof v === "object" &&
  v !== null &&
  ["x", "y", "z"].every(
    (k) => typeof (v as Record<string, unknown>)[k] === "number",
  );

/**
 * A text box with a suggestion button inside its right end: street and zone names at the record's point (or at the
 * admin) open in a list under the box, one click fills. Takes no extra height, so it fits list rows too.
 */
export function SuggestBox({
  from,
  onPick,
  children,
}: {
  from: string | undefined;
  onPick: (name: string) => void;
  /** The input; it gets room on the right for the button. */
  children: ReactNode;
}) {
  const { t, record } = useEditor();
  const [names, setNames] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const point = from ? getAt(record, from) : undefined;
  const ask = async () => {
    setBusy(true);
    setNames(await placeNames(isPointValue(point) ? point : null));
    setBusy(false);
  };
  return (
    <Popover
      open={names !== null}
      onOpenChange={(open) => !open && setNames(null)}
      anchor={
        <div className="relative w-full min-w-0 [&>input]:pr-[3.6vh]">
          {children}
          <span className="absolute inset-y-0 right-[0.4vh] flex items-center">
            <Tooltip content={t("ADMIN_SUGGEST")}>
              <button
                type="button"
                aria-label={t("ADMIN_SUGGEST")}
                aria-busy={busy || undefined}
                onClick={() => void ask()}
                className="flex size-[2.8vh] items-center justify-center rounded-full text-[1.15vh] text-text-3 transition-[background-color,color] duration-150 hover:bg-tgi-green-10 hover:text-tgi-green focus-visible:bg-tgi-green-10 focus-visible:text-tgi-green focus-visible:outline-none"
              >
                <FontAwesomeIcon
                  icon={busy ? faCircleNotch : faWandMagicSparkles}
                  spin={busy}
                  aria-hidden
                />
              </button>
            </Tooltip>
          </span>
        </div>
      }
    >
      <div className="flex w-max max-w-[44vh] min-w-[max(26vh,var(--radix-popper-anchor-width))] flex-col">
        <span className="px-[1vh] pt-[0.6vh] pb-[0.4vh] text-[1.1vh] font-semibold text-text-3 uppercase">
          {t("ADMIN_SUGGEST_HINT")}
        </span>
        {names?.length === 0 && (
          <p className="px-[1vh] py-[1vh] text-[1.25vh] text-text-3">
            {t("ADMIN_SUGGEST_EMPTY")}
          </p>
        )}
        {names?.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              onPick(name);
              setNames(null);
            }}
            className="flex min-h-[3.4vh] shrink-0 items-center rounded-[0.6vh] px-[1vh] py-[0.6vh] text-left text-[1.35vh] leading-[1.3] transition-colors duration-150 outline-none hover:bg-white/8 focus-visible:bg-white/8"
          >
            {name}
          </button>
        ))}
      </div>
    </Popover>
  );
}
