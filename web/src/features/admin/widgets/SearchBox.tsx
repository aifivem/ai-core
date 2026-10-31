import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { useEditor } from "../context";

/** Rows a long list shows at first and adds per "Show more". */
export const SHOWN_STEP = 50;

/** The search box above a long list in a card, with the number of matching entries. */
export function SearchBox({
  query,
  onQuery,
  count,
}: {
  query: string;
  onQuery: (query: string) => void;
  count: number;
}) {
  const { t } = useEditor();
  return (
    <div className="flex items-center gap-[1.4vh] pt-[0.4vh]">
      <label className="flex h-[3.6vh] w-[40vh] items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] transition-[border-color] duration-150 focus-within:border-tgi-green-40 hover:border-white/14">
        <input
          className="h-full min-w-0 flex-1 bg-transparent text-[1.35vh] outline-none placeholder:text-text-4"
          value={query}
          placeholder={t("ADMIN_SEARCH")}
          aria-label={t("ADMIN_SEARCH")}
          onChange={(e) => onQuery(e.target.value)}
        />
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="text-[1.3vh] text-text-3"
          aria-hidden
        />
      </label>
      <span className="text-[1.3vh] text-text-3 tabular-nums">
        {t("ADMIN_TABLE_COUNT", count)}
      </span>
    </div>
  );
}
