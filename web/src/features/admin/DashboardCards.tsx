import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faChevronRight,
  faCloudArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import type {
  AdminPanelSnapshot,
  ExternalPanel,
  UpdateInfo,
} from "@aicore-fivem/shared";
import { goTo, openExternal } from "./actions";
import { iconOf } from "./icons";
import { openRecommendationPage } from "./recommendationActions";

/** The dashboard's cards: a script with its tabs, the outdated scripts, another script's panel. */

export const text = (
  panel: AdminPanelSnapshot,
  core: Record<string, string>,
  key: string,
): string => panel.texts[key] ?? core[key] ?? key;

export function ScriptCard({
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
          <span
            title={text(panel, core, panel.schema.title)}
            className="truncate text-[1.6vh] leading-[1.3] font-semibold"
          >
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
export function Updates({
  updates,
  t,
}: {
  updates: UpdateInfo[];
  t: (key: string, ...args: string[]) => string;
}) {
  return (
    <section className="flex flex-col gap-[1vh]">
      <h2 className="flex items-center gap-[0.8vh] text-[1.2vh] font-semibold text-tgi-green uppercase">
        <FontAwesomeIcon icon={faCloudArrowDown} aria-hidden />
        {t("ADMIN_UPDATES")}
      </h2>
      <div className="flex flex-col gap-[0.6vh]">
        {updates.map((u) => (
          <div
            key={u.resource}
            className="flex h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] bg-row px-[1.4vh]"
          >
            <span className="font-mono text-[1.35vh] font-medium">
              {u.label}
            </span>
            <span className="rounded-full bg-tgi-green-15 px-[0.9vh] py-[0.3vh] text-[1.15vh] font-semibold text-tgi-green tabular-nums">
              {t("ADMIN_UPDATE_TO", u.current, u.latest)}
            </span>
            <span className="min-w-0 flex-1" />
            <button
              type="button"
              title={u.url}
              onClick={() => openRecommendationPage(u.url)}
              className="flex h-[3vh] shrink-0 items-center gap-[0.6vh] rounded-full bg-control px-[1.2vh] text-[1.2vh] font-medium text-text-2 transition-colors duration-150 hover:bg-control-hover hover:text-text"
            >
              <FontAwesomeIcon
                icon={faArrowUpRightFromSquare}
                className="text-[1vh]"
                aria-hidden
              />
              {t("ADMIN_UPDATE_OPEN")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExternalCard({
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
        <span
          title={panel.label}
          className="line-clamp-2 text-[1.6vh] leading-[1.3] font-semibold"
        >
          {panel.label}
        </span>
        <span
          title={panel.description ?? panel.resource}
          className="line-clamp-2 text-[1.2vh] leading-[1.5] text-text-3"
        >
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
