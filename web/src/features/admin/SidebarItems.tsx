import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "../../lib/utils";

/** A top-level sidebar row (dashboard, a folded script); long labels wrap to two lines. */
export const navRow = (active: boolean) =>
  cn(
    "flex min-h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] px-[1.4vh] py-[0.7vh] text-left text-[1.5vh] transition-[background-color,color] duration-150 ease-out",
    active
      ? "bg-tgi-green-15 font-semibold text-tgi-green"
      : "font-medium text-text-2 hover:bg-white/5 hover:text-text",
  );

/** A tab row inside an open group. */
export const tabRow = (active: boolean) =>
  cn(
    "flex min-h-[4.2vh] items-center gap-[1vh] rounded-[0.8vh] px-[1vh] py-[0.6vh] text-left text-[1.4vh] transition-[background-color,color] duration-150 ease-out",
    active
      ? "bg-tgi-green-15 font-semibold text-tgi-green"
      : "font-medium text-text-2 hover:bg-white/5 hover:text-text",
  );

/** A row label: wraps to two lines, then ends with an ellipsis (the full text in `title`). */
export function NavLabel({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="line-clamp-2 min-w-0 flex-1 leading-[1.25] break-words"
    >
      {text}
    </span>
  );
}

/** An open group: its own row (icon badge, label, chevron), then its entries one step in, on a guide line. */
export function NavGroup({
  icon,
  label,
  onClick,
  children,
}: {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.4vh] rounded-[1.1vh] bg-white/3 p-[0.4vh] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] px-[1vh] py-[0.7vh] text-left text-[1.5vh] font-semibold text-text transition-colors duration-150 hover:bg-white/5"
      >
        <span className="flex size-[3vh] shrink-0 items-center justify-center rounded-[0.7vh] bg-tgi-green-15 text-[1.4vh] text-tgi-green">
          <FontAwesomeIcon icon={icon} aria-hidden />
        </span>
        <NavLabel text={label} />
        <FontAwesomeIcon
          icon={faChevronDown}
          className="shrink-0 text-[1.1vh] text-text-3"
          aria-hidden
        />
      </button>
      <div className="ml-[2.5vh] flex flex-col gap-[0.3vh] border-l border-white/10 pb-[0.4vh] pl-[0.8vh]">
        {children}
      </div>
    </div>
  );
}

/** A section row under the brand (dashboard, Players, Bans): its icon and label, green while its page is open. */
export function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconDefinition;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={navRow(active)}
    >
      <FontAwesomeIcon
        icon={icon}
        className="w-[1.8vh] shrink-0 text-[1.6vh]"
        aria-hidden
      />
      <NavLabel text={label} />
    </button>
  );
}
