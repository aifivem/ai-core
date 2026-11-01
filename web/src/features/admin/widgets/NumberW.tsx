import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { formatWeight } from "@aicore-fivem/lib/shared";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { useEditor } from "../context";
import { keys } from "./boxKeys";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** A number with -/+ (saved at once) and a box (saved on leave / Enter); the unit sticks to the value. */
export function NumberW({
  spec,
  path,
}: {
  spec: Spec<"number">;
  path: string;
}) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "number" ? value : (spec.min ?? 0);
  const [draft, setDraft] = useState(String(stored));
  useEffect(() => setDraft(String(stored)), [stored]);
  const clamp = (n: number) =>
    Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, n));
  const put = (n: number) => {
    const next = clamp(Math.round(n * 100) / 100);
    setDraft(String(next));
    if (next !== stored) save(next);
  };
  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (Number.isFinite(parsed)) put(parsed);
    else setDraft(String(stored));
  };
  const step = spec.step ?? 1;
  const unit = spec.unit ? (spec.unit === "$" ? "$" : t(spec.unit)) : "";
  const stepButton =
    "flex size-[3vh] shrink-0 items-center justify-center rounded-full bg-control text-[1.1vh] text-text-2 transition-[background-color,color,transform] duration-150 ease-out enabled:hover:bg-control-hover enabled:hover:text-text enabled:active:[transform:scale(0.92)] disabled:cursor-not-allowed disabled:opacity-40";
  // Grams also read as a weight, left of the box (80000 g = 80 kg).
  const kilos = spec.unit === "g" ? formatWeight(stored) : null;
  return (
    <div className="flex shrink-0 items-center gap-[1vh]">
      {kilos && (
        <span className="rounded-full bg-white/6 px-[1vh] py-[0.4vh] text-[1.2vh] font-semibold text-text-2 tabular-nums">
          {kilos}
        </span>
      )}
      <div className="flex h-[3.6vh] w-[20vh] shrink-0 items-center gap-[0.4vh] rounded-full border border-white/8 bg-[#2222224D] p-[0.2vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40">
        <button
          type="button"
          className={stepButton}
          aria-label={`${t(spec.label)} -${step}`}
          disabled={stored <= (spec.min ?? -Infinity)}
          onClick={() => put(stored - step)}
        >
          <FontAwesomeIcon icon={faMinus} />
        </button>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-[0.4vh]">
          {unit === "$" && (
            <span className="text-[1.25vh] font-semibold text-text-3">$</span>
          )}
          <input
            value={draft}
            inputMode="decimal"
            size={Math.max(2, draft.length)}
            aria-label={t(spec.label)}
            className="min-w-0 bg-transparent text-center text-[1.4vh] font-bold tabular-nums outline-none"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={keys(() => setDraft(String(stored)))}
          />
          {unit && unit !== "$" && (
            <span className="truncate text-[1.25vh] font-semibold text-text-3">
              {unit}
            </span>
          )}
        </span>
        <button
          type="button"
          className={stepButton}
          aria-label={`${t(spec.label)} +${step}`}
          disabled={stored >= (spec.max ?? Infinity)}
          onClick={() => put(stored + step)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}
