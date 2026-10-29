import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import type { AdminPanelSnapshot } from "@aicore-fivem/shared";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { goTo } from "./actions";
import { iconOf } from "./icons";

const fill = (texts: Record<string, string>, key: string): string => texts[key] ?? key;

/** Brand block, then every script with its tabs (icon + name); the open tab has a raised fill and accent text. */
export function Sidebar({ resource, tab }: { resource: string | undefined; tab: string | undefined }) {
  const panels: AdminPanelSnapshot[] = useAppSelector((state) => state.admin.panels);
  const core = useAppSelector((state) => state.admin.texts);
  return (
    <nav className="flex w-[30vh] shrink-0 flex-col border-r border-line bg-[rgba(var(--bg-rgb),0.6)]">
      <div className="flex h-[8vh] shrink-0 items-center gap-[1.2vh] border-b border-line px-[2vh]">
        <span className="flex size-[3.6vh] items-center justify-center rounded-[0.8vh] bg-accent text-[1.6vh] text-accent-text">
          <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[1.5vh] font-semibold leading-[1.3]">{fill(core, "ADMIN_PANEL_TITLE")}</span>
          <span className="truncate text-[1.15vh] uppercase tracking-[0.12em] text-text-3">ai-core</span>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-[2vh] p-[1.2vh]">
          {panels.map((panel) => (
            <div key={panel.resource} className="flex flex-col gap-[0.4vh]">
              <span className="flex items-center gap-[0.8vh] px-[1vh] pb-[0.4vh] text-[1.15vh] font-medium uppercase tracking-[0.18em] text-text-3">
                <FontAwesomeIcon icon={iconOf(panel.schema.icon)} aria-hidden />
                {fill(panel.texts, panel.schema.title)}
              </span>
              {panel.schema.tabs.map((item) => {
                const active = panel.resource === resource && item.id === tab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => goTo(panel.resource, item.id)}
                    className={cn(
                      "flex h-[3.8vh] items-center gap-[1.2vh] rounded-[0.6vh] px-[1.2vh] text-left text-[1.35vh] transition-colors duration-150",
                      active ? "bg-raised font-medium text-text" : "text-text-2 hover:bg-[rgba(255,255,255,0.03)] hover:text-text",
                    )}
                  >
                    <FontAwesomeIcon icon={iconOf(item.icon)} className={cn("w-[1.6vh] text-[1.4vh]", active ? "text-accent" : "text-text-3")} aria-hidden />
                    <span className="truncate">{fill(panel.texts, item.label)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </nav>
  );
}
