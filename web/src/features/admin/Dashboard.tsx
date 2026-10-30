import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faChevronRight,
  faCloudArrowDown,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import type {
  AdminPanelSnapshot,
  ExternalPanel,
  UpdateInfo,
  WidgetSpec,
} from "@aicore-fivem/shared";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useAppSelector } from "../../store";
import { goTo, openExternal } from "./actions";
import { iconOf } from "./icons";

interface Hit {
  kind: "tab" | "setting";
  resource: string;
  tab: string;
  title: string;
  where: string;
  icon: string;
}

const text = (
  panel: AdminPanelSnapshot,
  core: Record<string, string>,
  key: string,
): string => panel.texts[key] ?? core[key] ?? key;
const norm = (s: string) => s.toLocaleLowerCase();

/** Every field label of a tab, list rows included. */
function labels(fields: WidgetSpec[]): string[] {
  return fields.flatMap((f) => [
    f.label,
    ...(f.widget === "list" ? f.rows.map((r) => r.label) : []),
  ]);
}

/** Tabs and settings of every script matching the query (labels in the script's language). */
function search(
  panels: AdminPanelSnapshot[],
  core: Record<string, string>,
  query: string,
): Hit[] {
  const q = norm(query.trim());
  if (!q) return [];
  const hits: Hit[] = [];
  for (const panel of panels) {
    const title = text(panel, core, panel.schema.title);
    for (const tab of panel.schema.tabs) {
      const tabLabel = text(panel, core, tab.label);
      if (
        norm(tabLabel).includes(q) ||
        norm(text(panel, core, tab.desc)).includes(q) ||
        norm(title).includes(q) ||
        panel.resource.includes(q)
      )
        hits.push({
          kind: "tab",
          resource: panel.resource,
          tab: tab.id,
          title: tabLabel,
          where: title,
          icon: tab.icon,
        });
      for (const card of tab.cards)
        for (const label of labels(card.fields)) {
          const name = text(panel, core, label);
          if (norm(name).includes(q))
            hits.push({
              kind: "setting",
              resource: panel.resource,
              tab: tab.id,
              title: name,
              where: `${title} › ${tabLabel}`,
              icon: card.icon,
            });
        }
    }
  }
  return hits.slice(0, 80);
}

function ScriptCard({
  panel,
  core,
}: {
  panel: AdminPanelSnapshot;
  core: Record<string, string>;
}) {
  const first = panel.schema.tabs[0];
  return (
    <button
      type="button"
      disabled={!first}
      onClick={() => first && goTo(panel.resource, first.id)}
      className="group flex flex-col gap-[1.2vh] rounded-[1.2vh] border border-white/8 bg-white/3 p-[1.6vh] text-left transition-[background-color,border-color] duration-150 hover:border-tgi-green-40 hover:bg-white/6"
    >
      <div className="flex items-center gap-[1.2vh]">
        <span className="flex size-[4.2vh] shrink-0 items-center justify-center rounded-[1vh] bg-tgi-green-10 text-[1.8vh] text-tgi-green">
          <FontAwesomeIcon icon={iconOf(panel.schema.icon)} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
          <span className="truncate text-[1.6vh] leading-[1.3] font-semibold">
            {text(panel, core, panel.schema.title)}
          </span>
          <span className="truncate font-mono text-[1.15vh] text-text-3">
            {panel.resource}
          </span>
        </div>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="text-[1.2vh] text-text-4 transition-colors duration-150 group-hover:text-tgi-green"
          aria-hidden
        />
      </div>
      <div className="flex flex-wrap gap-[0.6vh]">
        {panel.schema.tabs.slice(0, 5).map((tab) => (
          <span
            key={tab.id}
            className="flex h-[2.4vh] items-center gap-[0.5vh] rounded-full bg-white/6 px-[0.9vh] text-[1.15vh] text-text-2"
          >
            <FontAwesomeIcon
              icon={iconOf(tab.icon)}
              className="text-[1vh] text-text-3"
              aria-hidden
            />
            {text(panel, core, tab.label)}
          </span>
        ))}
        {panel.schema.tabs.length > 5 && (
          <span className="flex h-[2.4vh] items-center px-[0.6vh] text-[1.15vh] text-text-3">
            +{panel.schema.tabs.length - 5}
          </span>
        )}
      </div>
    </button>
  );
}

/** Scripts with a newer GitHub release: what runs, what is out, where to get it. */
function Updates({ updates, t }: { updates: UpdateInfo[]; t: (key: string, ...args: string[]) => string }) {
  return (
    <section className="flex flex-col gap-[1vh]">
      <h2 className="flex items-center gap-[0.8vh] text-[1.2vh] font-semibold text-tgi-green uppercase">
        <FontAwesomeIcon icon={faCloudArrowDown} aria-hidden />
        {t("ADMIN_UPDATES")}
      </h2>
      <div className="flex flex-col gap-[0.6vh]">
        {updates.map((u) => (
          <div key={u.resource} className="flex h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] bg-row px-[1.4vh]">
            <span className="font-mono text-[1.35vh] font-medium">{u.resource}</span>
            <span className="rounded-full bg-tgi-green-15 px-[0.9vh] py-[0.3vh] text-[1.15vh] font-semibold text-tgi-green tabular-nums">
              {t("ADMIN_UPDATE_TO", u.current, u.latest)}
            </span>
            <span className="min-w-0 flex-1 truncate text-right font-mono text-[1.15vh] text-text-3 select-text">{u.url}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExternalCard({
  panel,
  t,
}: {
  panel: ExternalPanel;
  t: (key: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => openExternal(panel)}
      className="group flex items-center gap-[1.2vh] rounded-[1.2vh] border border-white/8 bg-white/3 p-[1.6vh] text-left transition-[background-color,border-color] duration-150 hover:border-tgi-green-40 hover:bg-white/6"
    >
      <span className="flex size-[4.2vh] shrink-0 items-center justify-center rounded-[1vh] bg-white/8 text-[1.8vh] text-text-2">
        <FontAwesomeIcon
          icon={iconOf(panel.icon ?? "puzzle-piece")}
          aria-hidden
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
        <span className="truncate text-[1.6vh] leading-[1.3] font-semibold">
          {panel.label}
        </span>
        <span className="truncate text-[1.2vh] text-text-3">
          {panel.description ?? panel.resource}
        </span>
      </div>
      <span className="flex h-[3vh] shrink-0 items-center gap-[0.6vh] rounded-full bg-control px-[1.2vh] text-[1.2vh] font-medium text-text-2 transition-colors duration-150 group-hover:bg-control-hover group-hover:text-text">
        <FontAwesomeIcon
          icon={faArrowUpRightFromSquare}
          className="text-[1vh]"
          aria-hidden
        />
        {t("ADMIN_OPEN_PANEL")}
      </span>
    </button>
  );
}

/** The panel's home: search over every script's tabs and settings, script cards, and other scripts' panels. */
export function Dashboard() {
  const panels = useAppSelector((state) => state.admin.panels);
  const external = useAppSelector((state) => state.admin.external);
  const updates = useAppSelector((state) => state.admin.updates);
  const core = useAppSelector((state) => state.admin.texts);
  const t = (key: string, ...args: string[]) =>
    (core[key] ?? key).replace(
      /\{(\d+)\}/g,
      (_, i: string) => args[Number(i)] ?? "",
    );
  const [query, setQuery] = useState("");
  const hits = useMemo(
    () => search(panels, core, query),
    [panels, core, query],
  );
  const q = norm(query.trim());
  const scripts = q
    ? panels.filter(
        (p) =>
          norm(text(p, core, p.schema.title)).includes(q) ||
          p.resource.includes(q),
      )
    : panels;
  const others = q
    ? external.filter(
        (e) => norm(e.label).includes(q) || norm(e.resource).includes(q),
      )
    : external;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.6vh]">
      <label className="flex h-[4.4vh] shrink-0 items-center gap-[1vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.6vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="text-[1.4vh] text-text-3"
          aria-hidden
        />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("ADMIN_SEARCH_ALL")}
          aria-label={t("ADMIN_SEARCH_ALL")}
          className="h-full min-w-0 flex-1 bg-transparent text-[1.5vh] outline-none placeholder:text-text-4"
        />
      </label>
      <ScrollArea className="-mr-[1.2vh] min-h-0 flex-1 pr-[1.2vh]">
        <div className="flex flex-col gap-[2.4vh] pb-[1vh]">
          {!q && updates.length > 0 && <Updates updates={updates} t={t} />}
          {q && hits.length > 0 && (
            <section className="flex flex-col gap-[0.6vh]">
              {hits.map((hit, i) => (
                <button
                  key={`${hit.resource}/${hit.tab}/${hit.title}/${i}`}
                  type="button"
                  onClick={() => goTo(hit.resource, hit.tab)}
                  className="flex h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] bg-row px-[1.4vh] text-left transition-colors duration-150 hover:bg-white/6"
                >
                  <FontAwesomeIcon
                    icon={iconOf(hit.icon)}
                    className="w-[1.8vh] text-[1.4vh] text-text-3"
                    aria-hidden
                  />
                  <span className="truncate text-[1.4vh] font-medium">
                    {hit.title}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[1.2vh] text-text-3">
                    {hit.where}
                  </span>
                  <span className="shrink-0 rounded-[0.4vh] bg-white/6 px-[0.6vh] text-[1.05vh] font-bold text-text-3 uppercase">
                    {t(
                      hit.kind === "tab"
                        ? "ADMIN_RESULT_TAB"
                        : "ADMIN_RESULT_SETTING",
                    )}
                  </span>
                </button>
              ))}
            </section>
          )}
          {q &&
            hits.length === 0 &&
            scripts.length === 0 &&
            others.length === 0 && (
              <p className="py-[4vh] text-center text-[1.4vh] text-text-3">
                {t("ADMIN_SEARCH_EMPTY", query.trim())}
              </p>
            )}
          {scripts.length > 0 && (
            <section className="flex flex-col gap-[1vh]">
              <h2 className="text-[1.2vh] font-semibold text-text-3 uppercase">
                {t("ADMIN_SCRIPTS")}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(34vh,1fr))] gap-[1.2vh]">
                {scripts.map((panel) => (
                  <ScriptCard key={panel.resource} panel={panel} core={core} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section className="flex flex-col gap-[1vh]">
              <h2 className="text-[1.2vh] font-semibold text-text-3 uppercase">
                {t("ADMIN_OTHER_PANELS")}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(34vh,1fr))] gap-[1.2vh]">
                {others.map((panel) => (
                  <ExternalCard key={panel.id} panel={panel} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
