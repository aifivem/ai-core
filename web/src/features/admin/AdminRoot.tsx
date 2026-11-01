import { useEffect } from "react";
import { useParams, useRouterState, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useNuiEvent } from "fivem-nui-react";
import { NuiMessage } from "../../../../resource/common/nui";
import { useAppSelector } from "../../store";
import { closePanel, loadPanelData } from "./actions";
import { OPEN_OPTIONS, onDelta, onOpen } from "./adminMessages";
import { Dashboard } from "./Dashboard";
import { Editor } from "./Editor";
import { usePanelLang } from "./lang";
import { PanelHeader } from "./PanelHeader";
import { RecordsView } from "./RecordsView";
import { BansSection } from "./bans/BansSection";
import { PlayersSection } from "./players/PlayersSection";
import { onRecommendationDelta } from "./recommendationActions";
import { Setup } from "./Setup";
import { Sidebar } from "./Sidebar";
import { TableView } from "./TableView";

/** The admin panel: client messages, Esc to close, and the large centred panel (sidebar, header, editor). */
export function AdminRoot() {
  const open = useAppSelector((state) => state.admin.open);
  const picking = useAppSelector((state) => state.admin.picking);
  const coreTexts = useAppSelector((state) => state.admin.texts);
  const external = useAppSelector((state) => state.admin.external);
  const { resource, tab: tabId, id: externalId } = useParams({ strict: false });
  const { key, char, q } = useSearch({ strict: false });
  const players = useRouterState({
    select: (s) => s.location.pathname === "/admin/players",
  });
  const bans = useRouterState({
    select: (s) => s.location.pathname === "/admin/bans",
  });
  const setup = useRouterState({
    select: (s) => s.location.pathname === "/admin/setup",
  });
  const panel = useAppSelector((state) =>
    state.admin.panels.find((p) => p.resource === resource),
  );
  const t = usePanelLang(resource);

  useNuiEvent(NuiMessage.adminOpen, onOpen, OPEN_OPTIONS);
  useNuiEvent(NuiMessage.adminDelta, onDelta);
  useNuiEvent(NuiMessage.adminRecommendation, onRecommendationDelta);

  // A script's records come when the admin opens it (the open summary has only its settings and labels).
  const unloaded = panel?.loaded === false;
  useEffect(() => {
    if (open && resource && unloaded) void loadPanelData(resource);
  }, [open, resource, unloaded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && !event.defaultPrevented && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  if (picking)
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] flex justify-center">
        <span className="rounded-full bg-[rgba(19,19,19,0.75)] px-[2vh] py-[1vh] text-[1.35vh] font-medium text-text-2">
          {coreTexts.ADMIN_FREECAM_HELP ?? ""}
        </span>
      </div>
    );
  const tab = panel?.schema.tabs.find((item) => item.id === tabId);
  const kind = tab ? panel?.schema.files[tab.file]?.kind : undefined;
  const page = externalId
    ? external.find((e) => e.id === externalId)
    : undefined;
  const dashboard = !tab && !page && !setup && !players && !bans;
  const title = players
    ? (coreTexts.ADMIN_PLAYERS ?? "")
    : bans
      ? (coreTexts.ADMIN_BANS ?? "")
      : setup
        ? (coreTexts.ADMIN_SETUP ?? "")
        : page
          ? page.label
          : tab
            ? t(tab.label)
            : (coreTexts.ADMIN_DASHBOARD ?? "");
  const subtitle = players
    ? (coreTexts.ADMIN_PLAYERS_DESC ?? "")
    : bans
      ? (coreTexts.ADMIN_BANS_DESC ?? "")
      : setup
        ? (coreTexts.ADMIN_SETUP_DESC ?? "")
        : page
          ? (page.description ?? page.resource)
          : tab
            ? t(tab.desc)
            : (coreTexts.ADMIN_DASHBOARD_DESC ?? "");

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <motion.div
        initial={{ opacity: 0, y: "1vh" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          duration: 0.4,
          bounce: 0,
          opacity: { type: "tween", duration: 0.3, ease: "easeOut" },
        }}
        className="flex h-[calc(100vh-3vh)] w-[calc(100vw-3vh)] overflow-hidden rounded-[1.8vh] bg-panel [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),inset_0_0.1vh_0_rgba(255,255,255,0.06),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]"
      >
        <Sidebar resource={resource} tab={tabId} dashboard={dashboard} />
        <main className="flex min-w-0 flex-1 flex-col">
          <PanelHeader
            title={title}
            subtitle={subtitle}
            dashboard={dashboard}
            t={t}
          />
          <div className="flex min-h-0 flex-1 flex-col p-[2.2vh] pr-[1.2vh]">
            {dashboard && <Dashboard />}
            {setup && <Setup />}
            {players && <PlayersSection char={char} t={t} />}
            {bans && <BansSection q={q} t={t} />}
            {page?.url && (
              <iframe
                title={page.label}
                src={page.url}
                className="min-h-0 flex-1 rounded-[1vh] border border-white/8 bg-page"
              />
            )}
            {panel && tab && kind === "settings" && (
              <Editor
                key={`${panel.resource}/${tab.id}`}
                tab={tab}
                ctx={{
                  resource: panel.resource,
                  file: tab.file,
                  key: undefined,
                  record: panel.data[tab.file] ?? {},
                  t,
                }}
              />
            )}
            {panel && tab && kind === "records" && panel.loaded === false && (
              <p className="px-[0.4vh] text-[1.35vh] text-text-3">
                {coreTexts.ADMIN_LOADING ?? ""}
              </p>
            )}
            {panel &&
              tab &&
              kind === "records" &&
              panel.loaded !== false &&
              tab.table && (
                <TableView
                  key={`${panel.resource}/${tab.id}`}
                  panel={panel}
                  file={tab.file}
                  table={tab.table}
                  t={t}
                />
              )}
            {panel &&
              tab &&
              kind === "records" &&
              panel.loaded !== false &&
              !tab.table && (
                <RecordsView
                  key={`${panel.resource}/${tab.id}`}
                  panel={panel}
                  tab={tab}
                  selected={key}
                  t={t}
                />
              )}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
