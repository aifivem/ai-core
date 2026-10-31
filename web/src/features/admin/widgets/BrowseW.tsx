import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { useEditor } from "../context";
import { getAt } from "../path";
import { useField } from "./basic";
import { SearchBox, SHOWN_STEP } from "./SearchBox";

type Spec = Extract<WidgetSpec, { widget: "browse" }>;

/**
 * A long read-only names list: search, 50 at a time, and per entry a button that adds a row with it to another list
 * (`addTo`); entries a row there already names show a chip instead.
 */
export function BrowseW({ spec }: { spec: Spec }) {
  const { t, record } = useEditor();
  const [value] = useField(spec.path);
  const addTo = spec.addTo;
  const [target, saveTarget] = useField(addTo?.path ?? spec.path);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(SHOWN_STEP);
  const names = useMemo(
    () =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : [],
    [value],
  );
  const rows = useMemo(
    () => (addTo && Array.isArray(target) ? target : []),
    [addTo, target],
  );
  const listed = useMemo(() => {
    const out = new Set<string>();
    if (addTo)
      for (const row of rows) {
        const name = getAt(row, addTo.field);
        if (typeof name === "string") out.add(name);
      }
    return out;
  }, [rows, addTo]);
  const q = query.trim().toLowerCase();
  const matching = useMemo(
    () => (q ? names.filter((n) => n.toLowerCase().includes(q)) : names),
    [names, q],
  );
  const shown = matching.slice(0, limit);
  const add = (name: string) => {
    if (!addTo || getAt(record, addTo.path) === undefined) return;
    saveTarget([...rows, { ...addTo.newRow, [addTo.field]: name }]);
  };
  return (
    <div className="flex flex-col gap-[0.8vh] pb-[0.8vh]">
      <SearchBox
        query={query}
        onQuery={(next) => {
          setQuery(next);
          setLimit(SHOWN_STEP);
        }}
        count={matching.length}
      />
      {matching.length === 0 && (
        <p className="px-[0.4vh] text-[1.3vh] text-text-3">
          {t(q ? "ADMIN_NO_MATCH" : "ADMIN_TABLE_EMPTY")}
        </p>
      )}
      <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-[0.8vh] bg-white/3">
        {shown.map((name) => (
          <div
            key={name}
            className="flex min-h-[4.4vh] items-center gap-[1.2vh] px-[1.2vh] transition-[background-color] duration-150 hover:bg-white/4"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[1.3vh] text-text-2">
              {name}
            </span>
            {addTo &&
              (listed.has(name) ? (
                <span className="flex shrink-0 items-center gap-[0.5vh] rounded-full bg-tgi-green-10 px-[1vh] py-[0.4vh] text-[1.15vh] font-semibold text-tgi-green">
                  <FontAwesomeIcon icon={faCheck} aria-hidden />
                  {t(addTo.doneLabel)}
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => add(name)}>
                  <FontAwesomeIcon
                    icon={faPlus}
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t(addTo.label)}
                </Button>
              ))}
          </div>
        ))}
      </div>
      {matching.length > shown.length && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setLimit(limit + SHOWN_STEP)}
        >
          {t("ADMIN_SHOW_MORE", matching.length - shown.length)}
        </Button>
      )}
    </div>
  );
}
