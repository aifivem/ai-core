import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useAppSelector } from "../../store";
import { goSetup, jumpTo } from "./actions";
import { setupDone } from "./setupSteps";
import { KIND_KEYS } from "./GlobalSearch";
import { buildIndex, search } from "./searchIndex";
import { iconOf } from "./icons";
import { Recommendations } from "./Recommendations";
import { ExternalCard, ScriptCard, text, Updates } from "./DashboardCards";

const norm = (s: string) => s.toLocaleLowerCase();

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
  const index = useMemo(() => buildIndex(panels, core), [panels, core]);
  const hits = useMemo(
    () => search(index, query, 80).filter((e) => e.kind !== "script"),
    [index, query],
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
          {!q && !setupDone(panels) && (
            <button
              type="button"
              onClick={goSetup}
              className="group flex items-center gap-[1.6vh] rounded-[1.2vh] border border-tgi-green-40 bg-tgi-green-10 p-[1.8vh] text-left transition-colors duration-150 hover:bg-tgi-green-15"
            >
              <span className="flex size-[4.6vh] shrink-0 items-center justify-center rounded-[1vh] bg-tgi-green text-[1.9vh] text-tgi-green-text">
                <FontAwesomeIcon icon={iconOf("flag-checkered")} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
                <span className="text-[1.6vh] font-semibold">
                  {t("ADMIN_SETUP_BANNER")}
                </span>
                <span className="text-[1.3vh] text-text-3">
                  {t("ADMIN_SETUP_BANNER_DESC")}
                </span>
              </span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-[1.3vh] text-tgi-green"
                aria-hidden
              />
            </button>
          )}
          {!q && updates.length > 0 && <Updates updates={updates} t={t} />}
          {!q && <Recommendations t={t} />}
          {q && hits.length > 0 && (
            <section className="flex flex-col gap-[0.6vh]">
              {hits.map((hit, i) => (
                <button
                  key={`${hit.kind}/${hit.resource}/${hit.tab}/${hit.key ?? ""}/${hit.title}/${i}`}
                  type="button"
                  onClick={() => jumpTo(hit)}
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
                    {t(KIND_KEYS[hit.kind])}
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
