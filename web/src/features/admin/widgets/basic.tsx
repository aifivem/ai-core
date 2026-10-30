import { useEffect, useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { saveField } from "../actions";
import { useEditor } from "../context";
import { getAt } from "../path";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** The value at a path and its writer, for the editor the field sits in. */
export function useField(path: string): [unknown, (value: unknown) => void] {
  const { resource, file, key, record } = useEditor();
  return [getAt(record, path), (value) => void saveField(resource, file, key, path, value)];
}

/** Enter saves (by leaving the box); Esc reverts it and must not close the panel. */
function keys(revert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      revert();
    }
  };
}

/** Typed text, saved when the box is left or Enter is pressed. */
export function TextW({ spec, path }: { spec: Spec<"text">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "string" ? value : "";
  const [draft, setDraft] = useState(stored);
  useEffect(() => setDraft(stored), [stored]);
  const commit = () => draft.trim() !== stored && save(draft.trim());
  return (
    <Input
      value={draft}
      aria-label={t(spec.label)}
      placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={keys(() => setDraft(stored))}
    />
  );
}

/** A number with -/+ (saved at once) and a box (saved on leave / Enter); the unit sticks to the value. */
export function NumberW({ spec, path }: { spec: Spec<"number">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "number" ? value : (spec.min ?? 0);
  const [draft, setDraft] = useState(String(stored));
  useEffect(() => setDraft(String(stored)), [stored]);
  const clamp = (n: number) => Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, n));
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
  const stepButton = "flex size-[3vh] shrink-0 items-center justify-center rounded-full bg-control text-[1.1vh] text-text-2 transition-[background-color,color,transform] duration-150 ease-out enabled:hover:bg-control-hover enabled:hover:text-text enabled:active:[transform:scale(0.92)] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex h-[3.6vh] w-[20vh] shrink-0 items-center gap-[0.4vh] rounded-full border border-white/8 bg-[#2222224D] p-[0.2vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40">
      <button type="button" className={stepButton} aria-label={`${t(spec.label)} -${step}`} disabled={stored <= (spec.min ?? -Infinity)} onClick={() => put(stored - step)}>
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <span className="flex min-w-0 flex-1 items-center justify-center gap-[0.4vh]">
        {unit === "$" && <span className="text-[1.25vh] font-semibold text-text-3">$</span>}
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
        {unit && unit !== "$" && <span className="truncate text-[1.25vh] font-semibold text-text-3">{unit}</span>}
      </span>
      <button type="button" className={stepButton} aria-label={`${t(spec.label)} +${step}`} disabled={stored >= (spec.max ?? Infinity)} onClick={() => put(stored + step)}>
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}

export function SwitchW({ spec, path }: { spec: Spec<"switch">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  return <Switch aria-label={t(spec.label)} checked={value === true} onCheckedChange={(on) => save(on)} />;
}

/** Options are stored with their own type (a number option saves a number). */
export function SelectW({ spec, path }: { spec: Spec<"select">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const options = spec.options.map((o) => ({ value: String(o.value), label: t(o.label) }));
  return (
    <Select
      aria-label={t(spec.label)}
      className="w-[24vh]"
      value={value === undefined || value === null ? undefined : String(value)}
      options={options}
      onChange={(picked) => save(spec.options.find((o) => String(o.value) === picked)?.value ?? picked)}
    />
  );
}
