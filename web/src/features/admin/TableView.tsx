import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot, TableSpec } from "@aicore-fivem/shared";
import { VirtualList } from "../../components/VirtualList";
import { cn } from "../../lib/utils";
import { getAt } from "./path";
import { showValue } from "./widgets/InfoW";

type T = (key: string, ...args: Array<string | number>) => string;

interface Row {
  key: string;
  cells: Array<{ text: string; muted: boolean }>;
  /** Every cell lowercased, for the search. */
  haystack: string;
}

/** A records file as one read-only table (a row per record): search over every column, only visible rows render. */
export function TableView({
  panel,
  file,
  table,
  t,
}: {
  panel: AdminPanelSnapshot;
  file: string;
  table: TableSpec;
  t: T;
}) {
  const records = (panel.data[file] ?? {}) as Record<string, unknown>;
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const sortOf = (key: string): string => {
      const value = table.sort ? getAt(records[key], table.sort) : key;
      return typeof value === "string" ? value : key;
    };
    return Object.keys(records)
      .sort((a, b) => sortOf(a).localeCompare(sortOf(b)))
      .map((key): Row => {
        const cells = table.columns.map((column) =>
          showValue(getAt(records[key], column.path), column, t),
        );
        return {
          key,
          cells,
          haystack: cells
            .map((c) => c.text)
            .join(" ")
            .toLowerCase(),
        };
      });
  }, [records, table, t]);
  const q = search.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? rows.filter((row) => row.haystack.includes(q)) : rows),
    [rows, q],
  );
  const grid = {
    gridTemplateColumns: table.columns
      .map((c) => `minmax(0, ${c.width ?? 1}fr)`)
      .join(" "),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.2vh]">
      <div className="flex items-center gap-[1.4vh]">
        <label className="flex h-[3.6vh] w-[46vh] items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40 hover:border-white/14">
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-[1.35vh] outline-none placeholder:text-text-4"
            value={search}
            placeholder={t("ADMIN_SEARCH")}
            aria-label={t("ADMIN_SEARCH")}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="text-[1.3vh] text-text-3"
            aria-hidden
          />
        </label>
        <span className="text-[1.3vh] text-text-3 tabular-nums">
          {t("ADMIN_TABLE_COUNT", shown.length)}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.2vh] bg-surface [box-shadow:0_0_0_1px_rgba(255,255,255,0.07)]">
        <div
          className="grid shrink-0 [scrollbar-gutter:stable] gap-[1.6vh] overflow-y-hidden border-b border-white/8 px-[1.6vh] py-[1.2vh]"
          style={grid}
        >
          {table.columns.map((column) => (
            <span
              key={column.path}
              className="truncate text-[1.15vh] font-semibold tracking-[0.04em] text-text-3 uppercase"
            >
              {t(column.label)}
            </span>
          ))}
        </div>
        <VirtualList
          className="min-h-0 flex-1 [scrollbar-gutter:stable]"
          items={shown}
          estimateSize={4.6}
          getItemKey={(row) => row.key}
          empty={
            <p className="px-[1.6vh] py-[1.6vh] text-[1.4vh] leading-[1.45] text-text-3">
              {t(search ? "ADMIN_NO_MATCH" : "ADMIN_TABLE_EMPTY")}
            </p>
          }
          renderItem={(row) => (
            <div
              className="grid items-start gap-[1.6vh] border-b border-white/5 px-[1.6vh] py-[1.2vh] hover:bg-white/3"
              style={grid}
            >
              {row.cells.map((cell, i) => (
                <span
                  key={table.columns[i]?.path ?? i}
                  className={cn(
                    "min-w-0 text-[1.35vh] leading-[1.4] break-words",
                    table.columns[i]?.mono &&
                      !cell.muted &&
                      "font-mono text-[1.25vh]",
                    i === 0
                      ? "font-medium text-text"
                      : cell.muted
                        ? "text-text-4"
                        : "text-text-2",
                  )}
                >
                  {cell.text}
                </span>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
