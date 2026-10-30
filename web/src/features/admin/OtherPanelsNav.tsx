import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { useAppSelector } from "../../store";
import { goTo, openExternal } from "./actions";
import { iconOf } from "./icons";
import { NavGroup, NavLabel, navRow, tabRow } from "./SidebarItems";

/** ai-core's tab that edits the list; the sidebar shows it here instead of under Server. */
export const EXTERNAL_TAB = { resource: "ai-core", tab: "external" };

const openEditor = () => goTo(EXTERNAL_TAB.resource, EXTERNAL_TAB.tab);

/**
 * "Other panels": other scripts' own settings screens (a page inside the panel, or their command), one entry each,
 * and the editor that adds them. Open while one of them (or the editor) is shown or the filter matches.
 */
export function OtherPanelsNav({
  open,
  activeId,
  editing,
  filter,
}: {
  open: boolean;
  activeId: string | undefined;
  editing: boolean;
  filter: string;
}) {
  const external = useAppSelector((state) => state.admin.external);
  const core = useAppSelector((state) => state.admin.texts);
  const label = core.ADMIN_OTHER_PANELS ?? "ADMIN_OTHER_PANELS";
  const manage = core.ADMIN_MANAGE_EXTERNAL ?? "ADMIN_MANAGE_EXTERNAL";
  const shown = filter
    ? external.filter(
        (e) =>
          e.label.toLocaleLowerCase().includes(filter) ||
          e.resource.includes(filter),
      )
    : external;
  if (
    filter &&
    shown.length === 0 &&
    !label.toLocaleLowerCase().includes(filter)
  )
    return null;
  if (!open && !filter)
    return (
      <button type="button" onClick={openEditor} className={navRow(false)}>
        <FontAwesomeIcon
          icon={iconOf("puzzle-piece")}
          className="w-[1.8vh] shrink-0 text-[1.6vh]"
          aria-hidden
        />
        <NavLabel text={label} />
      </button>
    );
  return (
    <NavGroup icon={iconOf("puzzle-piece")} label={label} onClick={openEditor}>
      {shown.map((panel) => {
        const active = panel.id === activeId;
        return (
          <button
            key={panel.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => openExternal(panel)}
            className={tabRow(active)}
          >
            <FontAwesomeIcon
              icon={iconOf(panel.icon ?? "puzzle-piece")}
              className="w-[1.6vh] shrink-0 text-[1.3vh]"
              aria-hidden
            />
            <NavLabel text={panel.label} />
          </button>
        );
      })}
      <button
        type="button"
        aria-current={editing ? "page" : undefined}
        onClick={openEditor}
        className={tabRow(editing)}
      >
        <FontAwesomeIcon
          icon={faPenToSquare}
          className="w-[1.6vh] shrink-0 text-[1.3vh]"
          aria-hidden
        />
        <NavLabel text={manage} />
      </button>
    </NavGroup>
  );
}
