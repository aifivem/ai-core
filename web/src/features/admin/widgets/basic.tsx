import { useEffect, useState, type KeyboardEvent } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faMinus,
  faPlus,
  faTriangleExclamation,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons"
import type { WidgetSpec } from "@aicore-fivem/shared"
import { Input } from "../../../components/ui/input"
import { Select } from "../../../components/ui/select"
import { Switch } from "../../../components/ui/switch"
import { placeNames, saveField, type Point } from "../actions"
import { useEditor } from "../context"
import { getAt } from "../path"
import { LookupBox, useLookup } from "./lookup"

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>

/** The value at a path and its writer, for the editor the field sits in. */
export function useField(path: string): [unknown, (value: unknown) => void] {
  const { resource, file, key, record } = useEditor()
  return [
    getAt(record, path),
    (value) => void saveField(resource, file, key, path, value),
  ]
}

/** Enter saves (by leaving the box); Esc reverts it and must not close the panel. */
function keys(revert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur()
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      revert()
    }
  }
}

/** A value picked from a lookup list (item, job, gang, account); a stored value the game does not know is flagged. */
function LookupTextW({
  spec,
  path,
  source,
}: {
  spec: Spec<"text">
  path: string
  source: NonNullable<Spec<"text">["lookup"]>
}) {
  const { t } = useEditor()
  const [value, save] = useField(path)
  const stored = typeof value === "string" ? value : ""
  const { all } = useLookup(source, "")
  const current = all.find((o) => o.value === stored)
  const [query, setQuery] = useState(current?.label ?? stored)
  useEffect(() => setQuery(current?.label ?? stored), [stored, current?.label])
  const unknown = stored !== "" && all.length > 0 && !current
  return (
    <div className="flex items-center gap-[0.8vh]">
      <LookupBox
        source={source}
        query={query}
        onQuery={setQuery}
        onPick={(option) => {
          setQuery(option.label)
          if (option.value !== stored) save(option.value)
        }}
        empty={t("ADMIN_LOOKUP_EMPTY")}
        anchor={(input) => (
          <Input
            value={input.value}
            aria-label={t(spec.label)}
            placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
            onChange={(event) => input.onChange(event.target.value)}
            onFocus={(event) => {
              event.target.select()
              input.onFocus()
            }}
            onBlur={() => {
              input.onBlur()
              setQuery(current?.label ?? stored)
            }}
            onKeyDown={input.onKeyDown}
          />
        )}
      />
      {current && (
        <span className="shrink-0 font-mono text-[1.15vh] text-text-3">
          {current.value}
        </span>
      )}
      {unknown && (
        <span className="flex shrink-0 items-center gap-[0.5vh] rounded-[0.4vh] bg-danger-bg px-[0.7vh] py-[0.3vh] text-[1.1vh] font-semibold text-danger">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden />
          {t("ADMIN_LOOKUP_UNKNOWN")}
        </span>
      )}
    </div>
  )
}

const isPointValue = (v: unknown): v is Point =>
  typeof v === "object" &&
  v !== null &&
  ["x", "y", "z"].every(
    (k) => typeof (v as Record<string, unknown>)[k] === "number"
  )

/** Name suggestions as buttons: street and zone names at the record's point (or at the admin), one click fills. */
function Suggestions({
  from,
  onPick,
}: {
  from: string | undefined
  onPick: (name: string) => void
}) {
  const { t, record } = useEditor()
  const [names, setNames] = useState<string[] | null>(null)
  const point = from ? getAt(record, from) : undefined
  const key = isPointValue(point) ? `${point.x},${point.y},${point.z}` : "me"
  useEffect(() => setNames(null), [key])
  return (
    <div className="flex flex-wrap items-center gap-[0.6vh]">
      {names === null ? (
        <button
          type="button"
          onClick={async () =>
            setNames(await placeNames(isPointValue(point) ? point : null))
          }
          className="flex h-[2.6vh] items-center gap-[0.6vh] rounded-full bg-white/6 px-[1vh] text-[1.2vh] font-medium text-text-3 transition-colors duration-150 hover:bg-white/12 hover:text-text"
        >
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            className="text-[1vh]"
            aria-hidden
          />
          {t("ADMIN_SUGGEST")}
        </button>
      ) : (
        names.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="flex h-[2.6vh] items-center rounded-full bg-tgi-green-10 px-[1vh] text-[1.2vh] font-medium text-tgi-green transition-colors duration-150 hover:bg-tgi-green-20"
          >
            {name}
          </button>
        ))
      )}
    </div>
  )
}

/** Typed text, saved when the box is left or Enter is pressed; a lookup spec picks from a list instead. */
export function TextW({ spec, path }: { spec: Spec<"text">; path: string }) {
  if (spec.lookup)
    return <LookupTextW spec={spec} path={path} source={spec.lookup} />
  return <PlainTextW spec={spec} path={path} />
}

function PlainTextW({ spec, path }: { spec: Spec<"text">; path: string }) {
  const { t } = useEditor()
  const [value, save] = useField(path)
  const stored = typeof value === "string" ? value : ""
  const [draft, setDraft] = useState(stored)
  useEffect(() => setDraft(stored), [stored])
  const commit = () => draft.trim() !== stored && save(draft.trim())
  const input = (
    <Input
      value={draft}
      aria-label={t(spec.label)}
      placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={keys(() => setDraft(stored))}
    />
  )
  if (!spec.suggest) return input
  return (
    <div className="flex flex-col gap-[0.8vh]">
      {input}
      <Suggestions
        from={spec.suggest.from}
        onPick={(name) => {
          setDraft(name)
          if (name !== stored) save(name)
        }}
      />
    </div>
  )
}

/** A number with -/+ (saved at once) and a box (saved on leave / Enter); the unit sticks to the value. */
export function NumberW({
  spec,
  path,
}: {
  spec: Spec<"number">
  path: string
}) {
  const { t } = useEditor()
  const [value, save] = useField(path)
  const stored = typeof value === "number" ? value : (spec.min ?? 0)
  const [draft, setDraft] = useState(String(stored))
  useEffect(() => setDraft(String(stored)), [stored])
  const clamp = (n: number) =>
    Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, n))
  const put = (n: number) => {
    const next = clamp(Math.round(n * 100) / 100)
    setDraft(String(next))
    if (next !== stored) save(next)
  }
  const commit = () => {
    const parsed = Number(draft.replace(",", "."))
    if (Number.isFinite(parsed)) put(parsed)
    else setDraft(String(stored))
  }
  const step = spec.step ?? 1
  const unit = spec.unit ? (spec.unit === "$" ? "$" : t(spec.unit)) : ""
  const stepButton =
    "flex size-[3vh] shrink-0 items-center justify-center rounded-full bg-control text-[1.1vh] text-text-2 transition-[background-color,color,transform] duration-150 ease-out enabled:hover:bg-control-hover enabled:hover:text-text enabled:active:[transform:scale(0.92)] disabled:cursor-not-allowed disabled:opacity-40"
  return (
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
  )
}

export function SwitchW({
  spec,
  path,
}: {
  spec: Spec<"switch">
  path: string
}) {
  const { t } = useEditor()
  const [value, save] = useField(path)
  return (
    <Switch
      aria-label={t(spec.label)}
      checked={value === true}
      onCheckedChange={(on) => save(on)}
    />
  )
}

/** Options are stored with their own type (a number option saves a number). */
export function SelectW({
  spec,
  path,
}: {
  spec: Spec<"select">
  path: string
}) {
  const { t } = useEditor()
  const [value, save] = useField(path)
  const options = spec.options.map((o) => ({
    value: String(o.value),
    label: t(o.label),
  }))
  return (
    <Select
      aria-label={t(spec.label)}
      className="w-[24vh]"
      value={value === undefined || value === null ? undefined : String(value)}
      options={options}
      onChange={(picked) =>
        save(
          spec.options.find((o) => String(o.value) === picked)?.value ?? picked
        )
      }
    />
  )
}
