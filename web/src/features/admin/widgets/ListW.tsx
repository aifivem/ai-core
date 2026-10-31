import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { useEditor } from "../context";
import { getAt } from "../path";
import { NumberW, SelectW, SwitchW, TextW, useField } from "./basic";
import { GradeW } from "./GradeW";
import { PointW } from "./more";
import { SearchBox, SHOWN_STEP } from "./SearchBox";

type Spec = Extract<WidgetSpec, { widget: "list" }>;

/** One control of a row; the label sits above it so a row of several numbers stays readable. */
function RowControl({
  spec,
  base,
  wrap,
}: {
  spec: WidgetSpec;
  /** The row's own path (`permissions.3`): row paths and `showIf` are read in it. */
  base: string;
  wrap: boolean;
}) {
  const { t, record } = useEditor();
  if (spec.showIf) {
    const value = getAt(record, `${base}.${spec.showIf.path}`);
    if (!spec.showIf.values.some((v) => v === value)) return null;
  }
  const path = `${base}.${spec.path}`;
  const control =
    spec.widget === "text" ? (
      <TextW spec={spec} path={path} />
    ) : spec.widget === "number" ? (
      <NumberW spec={spec} path={path} />
    ) : spec.widget === "switch" ? (
      <SwitchW spec={spec} path={path} />
    ) : spec.widget === "select" ? (
      <SelectW spec={spec} path={path} />
    ) : spec.widget === "grade" ? (
      <GradeW spec={spec} path={path} base={base} />
    ) : spec.widget === "point" ? (
      <PointW spec={spec} path={path} />
    ) : null;
  if (!control) return null;
  const grows = spec.widget === "text" || spec.widget === "point";
  return (
    <label
      className={`flex flex-col gap-[0.4vh] ${grows ? `min-w-0 flex-1 ${wrap ? "basis-[26vh]" : ""}` : "shrink-0"}`}
    >
      <span className="px-[0.4vh] text-[1.15vh] font-medium text-text-3">
        {t(spec.label)}
      </span>
      <div
        className={`flex h-[3.6vh] items-center ${spec.widget === "point" ? "[&>*]:flex-1" : ""}`}
      >
        {control}
      </div>
    </label>
  );
}

/** Every text and number of a row, lowercased, for the search. */
function haystack(row: unknown): string {
  if (typeof row === "string" || typeof row === "number")
    return String(row).toLowerCase();
  if (typeof row !== "object" || row === null) return "";
  return Object.values(row).map(haystack).join(" ");
}

/**
 * Rows of the same shape (job grades, route checkpoints, rule lists): edit in place, remove one, add one at the end.
 * `search` lists show a search box and the newest rows first, a page at a time.
 */
export function ListW({ spec }: { spec: Spec }) {
  const { t } = useEditor();
  const [value, save] = useField(spec.path);
  const rows = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(SHOWN_STEP);
  const full = spec.max !== undefined && rows.length >= spec.max;
  const min = spec.min ?? 1;
  const wrap = spec.wrap === true;
  const matching = useMemo(() => {
    const indexes = rows.map((_, index) => index);
    if (!spec.search) return indexes;
    const q = query.trim().toLowerCase();
    return indexes
      .filter((index) => !q || haystack(rows[index]).includes(q))
      .reverse();
  }, [rows, query, spec.search]);
  const shown = spec.search ? matching.slice(0, limit) : matching;
  return (
    <div className="flex flex-col gap-[0.8vh] pb-[0.4vh]">
      {spec.search && (
        <SearchBox
          query={query}
          onQuery={(q) => {
            setQuery(q);
            setLimit(SHOWN_STEP);
          }}
          count={matching.length}
        />
      )}
      {spec.search && query && matching.length === 0 && (
        <p className="px-[0.4vh] text-[1.3vh] text-text-3">
          {t("ADMIN_NO_MATCH")}
        </p>
      )}
      {shown.map((index) => (
        <div
          key={index}
          className={`flex items-end gap-[1.2vh] rounded-[0.8vh] bg-white/3 px-[1.2vh] pt-[0.8vh] pb-[1vh] transition-[background-color] duration-150 hover:bg-white/6 ${wrap ? "flex-wrap" : ""}`}
        >
          {spec.rowLabel && (
            <span className="mb-[0.9vh] w-[7vh] shrink-0 text-[1.35vh] font-medium text-text-2">
              {t(spec.rowLabel, index + 1)}
            </span>
          )}
          {spec.rows.map((row, i) => (
            <RowControl
              key={`${row.path}:${i}`}
              spec={row}
              base={`${spec.path}.${index}`}
              wrap={wrap}
            />
          ))}
          <Button
            variant="icon"
            className={`enabled:hover:bg-danger-bg enabled:hover:text-danger ${wrap ? "ml-auto" : ""}`}
            aria-label={`${t("ADMIN_REMOVE")} ${index + 1}`}
            disabled={rows.length <= min}
            onClick={() => save(rows.filter((__, i) => i !== index))}
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-[1vh]">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={full}
          onClick={() => {
            save([...rows, spec.newRow]);
            setQuery("");
          }}
        >
          <FontAwesomeIcon icon={faPlus} data-icon="inline-start" aria-hidden />
          {t(spec.addLabel)}
        </Button>
        {spec.search && matching.length > shown.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLimit(limit + SHOWN_STEP)}
          >
            {t("ADMIN_SHOW_MORE", matching.length - shown.length)}
          </Button>
        )}
      </div>
    </div>
  );
}
