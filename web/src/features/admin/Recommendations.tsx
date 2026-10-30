import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faLightbulb,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAppSelector } from "../../store";
import {
  dismissedIds,
  dismissRecommendation,
  openRecommendationPage,
} from "./recommendationActions";

/** Scripts ai-core recommends for this server: name, one line why, the product page and dismiss. */
export function Recommendations({ t }: { t: (key: string) => string }) {
  const all = useAppSelector((state) => state.admin.recommendations);
  const panels = useAppSelector((state) => state.admin.panels);
  // A dismiss hides the card at once; the server's delta follows.
  const dismissed = dismissedIds(panels);
  const list = all.filter((r) => !dismissed.includes(r.id));
  if (list.length === 0) return null;
  return (
    <section className="flex flex-col gap-[1vh]">
      <h2 className="flex items-center gap-[0.8vh] text-[1.2vh] font-semibold text-tgi-green uppercase">
        <FontAwesomeIcon icon={faLightbulb} aria-hidden />
        {t("ADMIN_RECOMMENDED")}
      </h2>
      <div className="flex flex-col gap-[0.6vh]">
        {list.map((r) => (
          <div
            key={r.id}
            className="flex h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] bg-row pr-[0.9vh] pl-[1.4vh]"
          >
            <span className="shrink-0 text-[1.4vh] font-semibold">
              {t(r.title)}
            </span>
            {r.free && (
              <span className="shrink-0 rounded-full bg-tgi-green-15 px-[0.9vh] py-[0.3vh] text-[1.15vh] font-semibold text-tgi-green uppercase">
                {t("ADMIN_REC_FREE")}
              </span>
            )}
            <span
              title={t(r.desc)}
              className="min-w-0 flex-1 truncate text-[1.25vh] text-text-3"
            >
              {t(r.desc)}
            </span>
            <button
              type="button"
              onClick={() => openRecommendationPage(r.url)}
              className="flex h-[3vh] shrink-0 items-center gap-[0.6vh] rounded-full bg-control px-[1.2vh] text-[1.2vh] font-medium text-text-2 transition-colors duration-150 hover:bg-control-hover hover:text-text"
            >
              <FontAwesomeIcon
                icon={faArrowUpRightFromSquare}
                className="text-[1vh]"
                aria-hidden
              />
              {t("ADMIN_REC_OPEN")}
            </button>
            <button
              type="button"
              onClick={() => dismissRecommendation(r.id)}
              title={t("ADMIN_REC_DISMISS")}
              aria-label={t("ADMIN_REC_DISMISS")}
              className="flex size-[3vh] shrink-0 items-center justify-center rounded-full text-[1.2vh] text-text-3 transition-colors duration-150 hover:bg-control-hover hover:text-text"
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
