import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faMagnifyingGlass, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot, TabSpec } from "@aicore-fivem/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { VirtualList } from "../../components/VirtualList";
import { cn } from "../../lib/utils";
import { goTo } from "./actions";
import { Editor } from "./Editor";
import { getAt } from "./path";
import { CreateDialog, DeleteDialog } from "./RecordDialogs";

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
  const labelOf = (key: string): string => {
    const label = spec?.labelPath ? getAt(records[key], spec.labelPath) : undefined;
    return typeof label === "string" && label ? label : key;
  };
  const keys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.keys(records)
      .filter((key) => !q || key.includes(q) || labelOf(key).toLowerCase().includes(q))
      .sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labelOf reads records
  }, [records, search]);
  const record = selected !== undefined ? records[selected] : undefined;
  const locked = selected !== undefined && (spec?.locked ?? []).includes(selected);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[32vh] shrink-0 flex-col gap-[1.2vh] border-r border-line p-[1.6vh]">
        <div className="relative">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute inset-y-0 left-[1.1vh] my-auto text-[1.2vh] text-text-3" aria-hidden />
          <Input className="pl-[3.2vh]" value={search} placeholder={t("ADMIN_SEARCH")} aria-label={t("ADMIN_SEARCH")} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {tab.createLabel && (
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <FontAwesomeIcon icon={faPlus} data-icon="inline-start" aria-hidden />
            {t(tab.createLabel)}
          </Button>
        )}
        <VirtualList
          className="-mx-[0.4vh] min-h-0 flex-1 px-[0.4vh]"
          items={keys}
          estimateSize={5.2}
          gap={0.4}
          getItemKey={(key) => key}
          empty={<p className="px-[0.8vh] py-[2vh] text-center text-[1.3vh] leading-[1.45] text-text-3">{t(search ? "ADMIN_NO_MATCH" : "ADMIN_EMPTY_LIST")}</p>}
          renderItem={(key) => {
            const sub = tab.listSub ? getAt(records[key], tab.listSub) : undefined;
            return (
              <button
                type="button"
                onClick={() => goTo(panel.resource, tab.id, key)}
                className={cn(
                  "flex w-full flex-col items-start gap-[0.2vh] rounded-[0.6vh] px-[1.2vh] py-[0.9vh] text-left transition-colors duration-150",
                  key === selected ? "bg-[rgba(var(--accent-rgb),0.1)]" : "hover:bg-raised",
                )}
              >
                <span className={cn("w-full truncate text-[1.35vh] font-medium leading-[1.3]", key === selected ? "text-accent" : "text-text")}>{labelOf(key)}</span>
                <span className="w-full truncate font-mono text-[1.15vh] leading-[1.3] text-text-3">{typeof sub === "string" && sub ? `${key} · ${sub}` : key}</span>
              </button>
            );
          }}
        />
      </div>

      {record === undefined || selected === undefined ? (
        <div className="flex flex-1 items-center justify-center p-[4vh] text-center text-[1.4vh] text-text-3">{t("ADMIN_PICK_RECORD")}</div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-[1.2vh] border-b border-line px-[2.4vh] py-[1.4vh]">
            <span className="truncate text-[1.7vh] font-semibold">{labelOf(selected)}</span>
            <span className="rounded-full bg-raised px-[1vh] py-[0.3vh] font-mono text-[1.15vh] text-text-3">{selected}</span>
            <span className="flex-1" />
            {locked ? (
              <span className="flex items-center gap-[0.6vh] text-[1.2vh] text-text-3">
                <FontAwesomeIcon icon={faLock} aria-hidden />
                {t("ADMIN_LOCKED")}
              </span>
            ) : (
              tab.deleteLabel && (
                <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
                  <FontAwesomeIcon icon={faTrash} data-icon="inline-start" aria-hidden />
                  {t(tab.deleteLabel)}
                </Button>
              )
            )}
          </div>
          <Editor key={selected} tab={tab} ctx={{ resource: panel.resource, file: tab.file, key: selected, record, t }} />
          <DeleteDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            t={t}
            action={t(tab.deleteLabel ?? "ADMIN_DELETE")}
            name={labelOf(selected)}
            resource={panel.resource}
            file={tab.file}
            tab={tab.id}
            recordKey={selected}
          />
        </div>
      )}
      <CreateDialog open={creating} onClose={() => setCreating(false)} t={t} title={t(tab.createLabel ?? "ADMIN_CREATE")} resource={panel.resource} file={tab.file} tab={tab.id} />
    </div>
  );
}
