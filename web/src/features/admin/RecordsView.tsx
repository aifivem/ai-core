import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faFileImport,
  faLock,
  faMagnifyingGlass,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot, TabSpec } from "@aicore-fivem/shared";
import { Button } from "../../components/ui/button";
import { Tooltip } from "../../components/ui/tooltip";
import { VirtualList } from "../../components/VirtualList";
import { cn } from "../../lib/utils";
import { goTo } from "./actions";
import { Editor } from "./Editor";
import { iconOf } from "./icons";
import { getAt } from "./path";
import { CreateDialog, DeleteDialog } from "./RecordDialogs";
import { ExportButton, ImportDialog } from "./RecordTransfer";

type T = (key: string, ...args: Array<string | number>) => string;

interface Props {
  panel: AdminPanelSnapshot;
  tab: TabSpec;
  selected: string | undefined;
  t: T;
}

/** A records file: searchable list on the left, the picked record's editor on the right. */
export function RecordsView({ panel, tab, selected, t }: Props) {
  const spec = panel.schema.files[tab.file];
  const records = (panel.data[tab.file] ?? {}) as Record<string, unknown>;
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const labelOf = (key: string): string => {
    const label = spec?.labelPath
      ? getAt(records[key], spec.labelPath)
      : undefined;
    return typeof label === "string" && label ? label : key;
  };
  const keys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.keys(records)
      .filter(
        (key) =>
          !q || key.includes(q) || labelOf(key).toLowerCase().includes(q),
      )
      .sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labelOf reads records
  }, [records, search]);
  const record = selected !== undefined ? records[selected] : undefined;
  const locked =
    selected !== undefined && (spec?.locked ?? []).includes(selected);

  return (
    <div className="flex min-h-0 flex-1 gap-[2vh]">
      <div className="flex w-[46vh] shrink-0 flex-col gap-[1.2vh]">
        <div className="flex items-center gap-[1vh]">
          <label className="flex h-[3.6vh] min-w-0 flex-1 items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40 hover:border-white/14">
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
          <ExportButton
            records={records as Record<string, Record<string, unknown>>}
            t={t}
          />
          {tab.createLabel && (
            <Tooltip content={t("ADMIN_IMPORT")}>
              <Button
                variant="icon"
                aria-label={t("ADMIN_IMPORT")}
                onClick={() => setImporting(true)}
              >
                <FontAwesomeIcon icon={faFileImport} aria-hidden />
              </Button>
            </Tooltip>
          )}
          {tab.createLabel && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <FontAwesomeIcon
                icon={faPlus}
                data-icon="inline-start"
                aria-hidden
              />
              {t(tab.createLabel)}
            </Button>
          )}
        </div>
        <VirtualList
          className="min-h-0 flex-1 pr-[0.6vh]"
          items={keys}
          estimateSize={6.4}
          gap={0.6}
          getItemKey={(key) => key}
          empty={
            <p className="px-[0.4vh] py-[1.4vh] text-[1.4vh] leading-[1.45] text-text-3">
              {t(search ? "ADMIN_NO_MATCH" : "ADMIN_EMPTY_LIST")}
            </p>
          }
          renderItem={(key) => {
            const sub = tab.listSub
              ? getAt(records[key], tab.listSub)
              : undefined;
            const active = key === selected;
            return (
              <button
                type="button"
                onClick={() => goTo(panel.resource, tab.id, key)}
                className={cn(
                  "flex min-h-[6.4vh] w-full items-center gap-[1.2vh] rounded-[0.9vh] px-[1.4vh] py-[1vh] text-left transition-[background-color] duration-150 ease-out",
                  active
                    ? "bg-tgi-green-15"
                    : "bg-surface [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-[#202020]",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
                  <span
                    className={cn(
                      "truncate text-[1.5vh] leading-[1.2] font-semibold",
                      active && "text-tgi-green",
                    )}
                  >
                    {labelOf(key)}
                  </span>
                  <span className="truncate text-[1.25vh] leading-[1.2] text-text-3">
                    {typeof sub === "string" && sub ? `${key} · ${sub}` : key}
                  </span>
                </span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className={cn(
                    "text-[1.2vh]",
                    active ? "text-tgi-green" : "text-text-4",
                  )}
                  aria-hidden
                />
              </button>
            );
          }}
        />
      </div>

      {record === undefined || selected === undefined ? (
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[1.6vh] border-l border-white/8 pl-[2vh] text-center">
          <span className="flex size-[7vh] items-center justify-center rounded-full bg-white/5 text-[2.8vh] text-text-4">
            <FontAwesomeIcon icon={iconOf(tab.icon)} aria-hidden />
          </span>
          <p className="max-w-[48vh] text-[1.55vh] leading-[1.5] text-text-3">
            {t("ADMIN_PICK_RECORD")}
          </p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col border-l border-white/8 pl-[2vh]">
          <div className="flex shrink-0 items-center gap-[1.2vh] pb-[1.6vh]">
            <span className="flex min-w-0 flex-col gap-[0.4vh]">
              <span className="truncate text-[2.1vh] leading-[1.2] font-semibold">
                {labelOf(selected)}
              </span>
              <span className="truncate font-mono text-[1.25vh] leading-[1.2] text-text-3">
                {selected}
              </span>
            </span>
            <span className="flex-1" />
            {locked ? (
              <span className="flex items-center gap-[0.6vh] text-[1.3vh] text-tgi-green">
                <FontAwesomeIcon icon={faLock} aria-hidden />
                {t("ADMIN_LOCKED")}
              </span>
            ) : (
              tab.deleteLabel && (
                <Button variant="danger" onClick={() => setDeleting(true)}>
                  <FontAwesomeIcon
                    icon={faTrash}
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t(tab.deleteLabel)}
                </Button>
              )
            )}
          </div>
          <Editor
            key={selected}
            tab={tab}
            ctx={{
              resource: panel.resource,
              file: tab.file,
              key: selected,
              record,
              t,
            }}
          />
          <DeleteDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            t={t}
            action={t(tab.deleteLabel ?? "ADMIN_DELETE")}
            description={tab.deleteDesc ? t(tab.deleteDesc) : undefined}
            name={labelOf(selected)}
            resource={panel.resource}
            file={tab.file}
            tab={tab.id}
            recordKey={selected}
          />
        </div>
      )}
      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        t={t}
        resource={panel.resource}
        file={tab.file}
        existing={records as Record<string, Record<string, unknown>>}
      />
      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        t={t}
        title={t(tab.createLabel ?? "ADMIN_CREATE")}
        resource={panel.resource}
        file={tab.file}
        tab={tab.id}
      />
    </div>
  );
}
