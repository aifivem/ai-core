import { useEffect } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import type { AdminDelta, AdminPanelSnapshot } from "@aicore-fivem/shared";
import { NuiMessage } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { mockAdminOpen } from "../../dev/adminMock";
import { store, useAppSelector } from "../../store";
import { changed } from "../../store/admin";
import { closePanel, openPanel } from "./actions";
import { Editor } from "./Editor";
import { usePanelLang } from "./lang";
import { RecordsView } from "./RecordsView";
import { Sidebar } from "./Sidebar";

// One options object: a new one per render would re-subscribe (and re-fire the browser mock) on every render.
const OPEN_OPTIONS = { mockData: mockAdminOpen(), mockDelay: 300 };

function onOpen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  const { panels, texts } = value as { panels?: unknown; texts?: unknown };
  // ai-core builds both objects itself; only the outer shape is checked.
  if (Array.isArray(panels)) openPanel(panels as AdminPanelSnapshot[], typeof texts === "object" && texts !== null ? (texts as Record<string, string>) : {});
}

function onDelta(value: unknown): void {
  if (typeof value === "object" && value !== null && typeof (value as AdminDelta).resource === "string") store.dispatch(changed(value as AdminDelta));
}

/** The admin panel: client messages, Esc to close, and the large centred panel (sidebar, header, editor). */
export function AdminRoot() {
  const open = useAppSelector((state) => state.admin.open);
  const { resource, tab: tabId } = useParams({ strict: false });
  const { key } = useSearch({ strict: false });
  const panel = useAppSelector((state) => state.admin.panels.find((p) => p.resource === resource));
  const t = usePanelLang(resource);

  useNuiEvent(NuiMessage.adminOpen, onOpen, OPEN_OPTIONS);
  useNuiEvent(NuiMessage.adminDelta, onDelta);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !event.defaultPrevented && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const tab = panel?.schema.tabs.find((item) => item.id === tabId);
  const kind = tab ? panel?.schema.files[tab.file]?.kind : undefined;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.45)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0 }}
        className="flex h-[88vh] w-[165vh] overflow-hidden rounded-[1.2vh] border border-line bg-bg [box-shadow:inset_0_0.1vh_0_rgba(255,255,255,0.04),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]"
      >
        <Sidebar resource={resource} tab={tabId} />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[8vh] shrink-0 items-center gap-[1.6vh] border-b border-line px-[2.4vh]">
            <div className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
              <h1 className="truncate text-[2vh] font-semibold leading-[1.2] tracking-[-0.01em]">{tab ? t(tab.label) : ""}</h1>
              <p className="truncate text-[1.3vh] text-text-3">{tab ? t(tab.desc) : ""}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={closePanel}>
              <FontAwesomeIcon icon={faDoorOpen} data-icon="inline-start" aria-hidden />
              {t("ADMIN_CLOSE")}
            </Button>
          </header>
          {panel && tab && kind === "settings" && (
            <Editor key={`${panel.resource}/${tab.id}`} tab={tab} ctx={{ resource: panel.resource, file: tab.file, key: undefined, record: panel.data[tab.file] ?? {}, t }} />
          )}
          {panel && tab && kind === "records" && <RecordsView key={`${panel.resource}/${tab.id}`} panel={panel} tab={tab} selected={key} t={t} />}
        </main>
      </motion.div>
    </div>
  );
}
