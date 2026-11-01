import { useState } from "react";
import { useParams, useRouterState } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faGavel,
  faGauge,
  faShieldHalved,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot } from "@aicore-fivem/shared";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useAppSelector } from "../../store";
import { goDashboard, goTo } from "./actions";
import { iconOf } from "./icons";
import { EXTERNAL_TAB, OtherPanelsNav } from "./OtherPanelsNav";
import { goBans } from "./bans/actions";
import { goPlayers } from "./players/actions";
import { NavButton, NavGroup, NavLabel, navRow, tabRow } from "./SidebarItems";

const fill = (texts: Record<string, string>, key: string): string =>
  texts[key] ?? key;

/**
 * Brand block, the dashboard, a filter over scripts, then every script with its tabs (tgiann-core admin sidebar); the
 * open tab has a soft green fill and green text.
 */
export function Sidebar({
  resource,
  tab,
  dashboard,
}: {
  resource: string | undefined;
  tab: string | undefined;
  dashboard: boolean;
}) {
  const all: AdminPanelSnapshot[] = useAppSelector(
    (state) => state.admin.panels,
  );
  const core = useAppSelector((state) => state.admin.texts);
  const { id: externalId } = useParams({ strict: false });
  const players = useRouterState({
    select: (s) => s.location.pathname === "/admin/players",
  });
  const bans = useRouterState({
    select: (s) => s.location.pathname === "/admin/bans",
  });
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLocaleLowerCase();
  // The other panels editor is an ai-core tab, listed under "Other panels" instead of under Server.
  const isEditor = (res: string, id: string) =>
    res === EXTERNAL_TAB.resource && id === EXTERNAL_TAB.tab;
  const editing = !!resource && !!tab && isEditor(resource, tab);
  const openResource = editing ? undefined : resource;
  const panels = q
    ? all.filter(
        (p) =>
          p.resource.includes(q) ||
          fill(p.texts, p.schema.title).toLocaleLowerCase().includes(q) ||
          p.schema.tabs.some((t) =>
            fill(p.texts, t.label).toLocaleLowerCase().includes(q),
          ),
      )
    : all;
  return (
    <nav className="flex w-[28vh] shrink-0 flex-col border-r border-white/8 bg-header">
      <div className="flex h-[7.6vh] shrink-0 items-center gap-[1.2vh] border-b border-white/8 px-[1.8vh]">
        <span className="flex size-[4.4vh] shrink-0 items-center justify-center rounded-[1vh] bg-tgi-green-15 text-[2vh] text-tgi-green">
          <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-[0.6vh]">
          <span className="truncate font-display text-[1.5vh] leading-[1.15] font-extrabold tracking-[-0.01em] uppercase">
            {fill(core, "ADMIN_PANEL_TITLE")}
          </span>
          <span className="truncate font-mono text-[1.15vh] leading-[1.2] text-text-3">
            ai-core
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-[0.8vh] border-b border-white/8 p-[1.4vh]">
        <NavButton
          icon={faGauge}
          label={fill(core, "ADMIN_DASHBOARD")}
          active={dashboard}
          onClick={goDashboard}
        />
        <NavButton
          icon={faUsers}
          label={fill(core, "ADMIN_PLAYERS")}
          active={players}
          onClick={() => goPlayers()}
        />
        <NavButton
          icon={faGavel}
          label={fill(core, "ADMIN_BANS")}
          active={bans}
          onClick={() => goBans()}
        />
        <label className="flex h-[3.6vh] items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.2vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40">
          <FontAwesomeIcon
            icon={faFilter}
            className="text-[1.1vh] text-text-3"
            aria-hidden
          />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={fill(core, "ADMIN_FILTER_SCRIPTS")}
            aria-label={fill(core, "ADMIN_FILTER_SCRIPTS")}
            className="h-full min-w-0 flex-1 bg-transparent text-[1.3vh] outline-none placeholder:text-text-4"
          />
        </label>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-[0.6vh] p-[1.4vh]">
          {panels.map((panel) =>
            // Only the open script (or every match while filtering) shows its tabs; the others fold into one row.
            panel.resource !== openResource && !q ? (
              <button
                key={panel.resource}
                type="button"
                onClick={() =>
                  panel.schema.tabs[0] &&
                  goTo(panel.resource, panel.schema.tabs[0].id)
                }
                className={navRow(false)}
              >
                <FontAwesomeIcon
                  icon={iconOf(panel.schema.icon)}
                  className="w-[1.8vh] shrink-0 text-[1.6vh]"
                  aria-hidden
                />
                <NavLabel text={fill(panel.texts, panel.schema.title)} />
              </button>
            ) : (
              <NavGroup
                key={panel.resource}
                icon={iconOf(panel.schema.icon)}
                label={fill(panel.texts, panel.schema.title)}
                onClick={() =>
                  panel.schema.tabs[0] &&
                  goTo(panel.resource, panel.schema.tabs[0].id)
                }
              >
                {panel.schema.tabs
                  .filter((item) => !isEditor(panel.resource, item.id))
                  .map((item) => {
                    const active =
                      panel.resource === resource && item.id === tab;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => goTo(panel.resource, item.id)}
                        className={tabRow(active)}
                      >
                        <FontAwesomeIcon
                          icon={iconOf(item.icon)}
                          className="w-[1.6vh] shrink-0 text-[1.3vh]"
                          aria-hidden
                        />
                        <NavLabel text={fill(panel.texts, item.label)} />
                      </button>
                    );
                  })}
              </NavGroup>
            ),
          )}
          {all.some((p) => p.resource === EXTERNAL_TAB.resource) && (
            <OtherPanelsNav
              open={editing || !!externalId}
              activeId={externalId}
              editing={editing}
              filter={q}
            />
          )}
        </div>
      </ScrollArea>
    </nav>
  );
}
