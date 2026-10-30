import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faGauge, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot } from "@aicore-fivem/shared";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { goDashboard, goTo } from "./actions";
import { iconOf } from "./icons";

const fill = (texts: Record<string, string>, key: string): string => texts[key] ?? key;

const row = (active: boolean) =>
  cn(
    "flex h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] px-[1.4vh] text-left text-[1.5vh] transition-[background-color,color] duration-150 ease-out",
    active
      ? "bg-tgi-green-15 font-semibold text-tgi-green"
      : "font-medium text-text-2 hover:bg-white/5 hover:text-text",
  );

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
  const all: AdminPanelSnapshot[] = useAppSelector((state) => state.admin.panels);
  const core = useAppSelector((state) => state.admin.texts);
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLocaleLowerCase();
  const panels = q
    ? all.filter(
        (p) =>
          p.resource.includes(q) ||
          fill(p.texts, p.schema.title).toLocaleLowerCase().includes(q) ||
          p.schema.tabs.some((t) => fill(p.texts, t.label).toLocaleLowerCase().includes(q)),
      )
    : all;
  return (
    <nav className="flex w-[28vh] shrink-0 flex-col border-r border-white/8 bg-header">
      <div className="flex h-[7.6vh] shrink-0 items-center gap-[1.2vh] border-b border-white/8 px-[1.8vh]">
        <span className="flex size-[4.4vh] shrink-0 items-center justify-center rounded-[1vh] bg-tgi-green-15 text-[2vh] text-tgi-green">
          <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-[0.6vh]">
          <span className="truncate font-display font-extrabold text-[1.5vh] leading-[1.15] tracking-[-0.01em] uppercase">
            {fill(core, "ADMIN_PANEL_TITLE")}
          </span>
          <span className="truncate font-mono text-[1.15vh] leading-[1.2] text-text-3">ai-core</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-[0.8vh] border-b border-white/8 p-[1.4vh]">
        <button
          type="button"
          aria-current={dashboard ? "page" : undefined}
          onClick={goDashboard}
          className={row(dashboard)}
        >
          <FontAwesomeIcon icon={faGauge} className="w-[1.8vh] text-[1.6vh]" aria-hidden />
          <span className="truncate">{fill(core, "ADMIN_DASHBOARD")}</span>
        </button>
        <label className="flex h-[3.6vh] items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.2vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40">
          <FontAwesomeIcon icon={faFilter} className="text-[1.1vh] text-text-3" aria-hidden />
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
            panel.resource !== resource && !q ? (
              <button
                key={panel.resource}
                type="button"
                onClick={() => panel.schema.tabs[0] && goTo(panel.resource, panel.schema.tabs[0].id)}
                className={row(false)}
              >
                <FontAwesomeIcon icon={iconOf(panel.schema.icon)} className="w-[1.8vh] text-[1.6vh]" aria-hidden />
                <span className="truncate">{fill(panel.texts, panel.schema.title)}</span>
              </button>
            ) : (
              <div key={panel.resource} className="flex flex-col gap-[0.4vh]">
                <span className="flex items-center gap-[0.8vh] px-[1.4vh] pb-[0.4vh] text-[1.2vh] font-semibold text-text-3 uppercase">
                  <FontAwesomeIcon icon={iconOf(panel.schema.icon)} aria-hidden />
                  <span className="truncate">{fill(panel.texts, panel.schema.title)}</span>
                </span>
                {panel.schema.tabs.map((item) => {
                  const active = panel.resource === resource && item.id === tab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => goTo(panel.resource, item.id)}
                      className={row(active)}
                    >
                      <FontAwesomeIcon icon={iconOf(item.icon)} className="w-[1.8vh] text-[1.6vh]" aria-hidden />
                      <span className="truncate">{fill(panel.texts, item.label)}</span>
                    </button>
                  );
                })}
              </div>
            ),
          )}
        </div>
      </ScrollArea>
    </nav>
  );
}
