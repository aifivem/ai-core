import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { closePanel } from "./actions";
import { GlobalSearch } from "./GlobalSearch";

/** The panel's header: the open page's title and line, the global search (not on the dashboard) and Close. */
export function PanelHeader({
  title,
  subtitle,
  dashboard,
  t,
}: {
  title: string;
  subtitle: string;
  dashboard: boolean;
  t: (key: string) => string;
}) {
  return (
    <header className="flex h-[7.6vh] shrink-0 items-center gap-[1.6vh] border-b border-white/8 bg-header px-[2.2vh]">
      <div className="flex min-w-0 flex-1 flex-col gap-[0.6vh]">
        <h1 className="truncate font-display text-[2vh] leading-[1.15] font-extrabold tracking-[-0.01em] uppercase">
          {title}
        </h1>
        <p className="truncate text-[1.3vh] leading-[1.3] text-text-3">
          {subtitle}
        </p>
      </div>
      {/* The dashboard has its own big search box (it also filters the script cards). */}
      {!dashboard && <GlobalSearch />}
      <button
        type="button"
        onClick={closePanel}
        className="group flex items-center gap-[1vh] rounded-full"
      >
        <span className="text-[1.4vh] text-text-3 transition-colors duration-150 group-hover:text-text">
          {t("ADMIN_CLOSE")}
        </span>
        <span className="flex size-[4vh] items-center justify-center rounded-full bg-control text-text-2 transition-[background-color,color,transform] duration-150 ease-out group-hover:bg-control-hover group-hover:text-text group-active:[transform:scale(0.92)]">
          <FontAwesomeIcon
            icon={faDoorOpen}
            className="text-[1.6vh]"
            aria-hidden
          />
        </span>
      </button>
    </header>
  );
}
