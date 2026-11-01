import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { LookupOption, WidgetSpec } from "@aicore-fivem/shared";
import { Input } from "../../../components/ui/input";
import { useAppSelector } from "../../../store";
import { useEditor } from "../context";
import { keys } from "./boxKeys";
import { LookupBox, useLookup } from "./lookup";
import { SuggestBox } from "./suggest";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** A value picked from a lookup list (item, job, gang, account); a stored value the game does not know is flagged. */
function LookupTextW({
  spec,
  path,
  source,
}: {
  spec: Spec<"text">;
  path: string;
  source: NonNullable<Spec<"text">["lookup"]> | LookupOption[];
}) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "string" ? value : "";
  const { all } = useLookup(source, "");
  const current = all.find((o) => o.value === stored);
  const [query, setQuery] = useState(current?.label ?? stored);
  useEffect(() => setQuery(current?.label ?? stored), [stored, current?.label]);
  const unknown = stored !== "" && all.length > 0 && !current;
  return (
    <div className="flex items-center gap-[0.8vh]">
      <LookupBox
        source={source}
        query={query}
        onQuery={setQuery}
        onPick={(option) => {
          setQuery(option.label);
          if (option.value !== stored) save(option.value);
        }}
        empty={t("ADMIN_LOOKUP_EMPTY")}
        anchor={(input) => (
          <Input
            value={input.value}
            aria-label={t(spec.label)}
            placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
            onChange={(event) => input.onChange(event.target.value)}
            onFocus={(event) => {
              event.target.select();
              input.onFocus();
            }}
            onBlur={() => {
              input.onBlur();
              setQuery(current?.label ?? stored);
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
  );
}

/** Typed text, saved when the box is left or Enter is pressed; a lookup spec picks from a list instead. */
export function TextW({ spec, path }: { spec: Spec<"text">; path: string }) {
  if (spec.lookup)
    return <LookupTextW spec={spec} path={path} source={spec.lookup} />;
  if (spec.records)
    return <RecordsTextW spec={spec} path={path} file={spec.records} />;
  return <PlainTextW spec={spec} path={path} />;
}

/** Records of another file of the same panel as lookup options (label from the file's `labelPath`), "None" first. */
function RecordsTextW({
  spec,
  path,
  file,
}: {
  spec: Spec<"text">;
  path: string;
  file: string;
}) {
  const { resource, t } = useEditor();
  const panel = useAppSelector((s) =>
    s.admin.panels.find((p) => p.resource === resource),
  );
  const options = useMemo((): LookupOption[] => {
    const labelPath = panel?.schema.files[file]?.labelPath;
    // Before the script's records arrive, its label index gives the same choices.
    if (panel?.loaded === false)
      return [
        { value: "", label: t("ADMIN_NONE") },
        ...Object.entries(panel.index?.[file] ?? {}).map(([key, label]) => ({
          value: key,
          label: label || key,
        })),
      ];
    const records = panel?.data[file];
    const list = Object.entries(
      typeof records === "object" && records !== null ? records : {},
    ).map(([key, record]) => {
      const label =
        labelPath && typeof record === "object" && record !== null
          ? Reflect.get(record, labelPath)
          : undefined;
      return {
        value: key,
        label: typeof label === "string" && label ? label : key,
      };
    });
    return [{ value: "", label: t("ADMIN_NONE") }, ...list];
  }, [panel, file, t]);
  return <LookupTextW spec={spec} path={path} source={options} />;
}

function PlainTextW({ spec, path }: { spec: Spec<"text">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "string" ? value : "";
  const [draft, setDraft] = useState(stored);
  useEffect(() => setDraft(stored), [stored]);
  const commit = () => draft.trim() !== stored && save(draft.trim());
  const input = (
    <Input
      value={draft}
      aria-label={t(spec.label)}
      placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={keys(() => setDraft(stored))}
    />
  );
  if (!spec.suggest) return input;
  return (
    <SuggestBox
      from={spec.suggest.from}
      onPick={(name) => {
        setDraft(name);
        if (name !== stored) save(name);
      }}
    >
      {input}
    </SuggestBox>
  );
}
