import { useEffect, useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
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
  return (
    <div className="flex items-center gap-[0.6vh]">
      <Button variant="icon" aria-label={`${t(spec.label)} -${step}`} disabled={stored <= (spec.min ?? -Infinity)} onClick={() => put(stored - step)}>
        <FontAwesomeIcon icon={faMinus} />
      </Button>
      <div className="relative">
        {unit === "$" && <span className="pointer-events-none absolute inset-y-0 left-[1vh] flex items-center text-[1.3vh] text-text-3">$</span>}
        <Input
          value={draft}
          inputMode="decimal"
          aria-label={t(spec.label)}
          className={`w-[11vh] text-right tabular-nums ${unit === "$" ? "pl-[2.2vh]" : ""} ${unit && unit !== "$" ? "pr-[1vh]" : ""}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={keys(() => setDraft(String(stored)))}
        />
      </div>
      {unit && unit !== "$" && <span className="min-w-[4vh] text-[1.25vh] text-text-3">{unit}</span>}
      <Button variant="icon" aria-label={`${t(spec.label)} +${step}`} disabled={stored >= (spec.max ?? Infinity)} onClick={() => put(stored + step)}>
        <FontAwesomeIcon icon={faPlus} />
      </Button>
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
