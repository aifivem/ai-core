import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

/** The list panels of the Players and Bans sections: a titled panel, a clickable row and its name / sub line. */

export function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.2vh] bg-surface [box-shadow:0_0_0_1px_rgba(255,255,255,0.07)]">
      <div className="flex h-[4.8vh] shrink-0 items-center justify-between border-b border-white/8 px-[1.6vh]">
        <span className="text-[1.2vh] font-semibold text-text-3 uppercase">
          {title}
        </span>
        {count && (
          <span className="text-[1.25vh] text-text-3 tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function RowButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[6vh] w-full items-center gap-[1.4vh] border-b border-white/5 px-[1.6vh] text-left transition-colors duration-150 outline-none hover:bg-white/4 focus-visible:bg-white/6"
    >
      {children}
      <FontAwesomeIcon
        icon={faChevronRight}
        className="text-[1.1vh] text-text-4 transition-colors duration-150 group-hover:text-text-2"
        aria-hidden
      />
    </button>
  );
}

export function Who({ name, sub }: { name: string; sub: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
      <span className="truncate text-[1.45vh] font-medium">{name}</span>
      <span className="truncate text-[1.2vh] text-text-3">{sub}</span>
    </span>
  );
}
