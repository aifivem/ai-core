import { useEffect, useState } from "react";
import { useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faGavel } from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { NuiMessage } from "../../../../../resource/common/nui";
import { Button } from "../../../components/ui/button";
import { useAppSelector } from "../../../store";
import { PCard, type T } from "../players/parts";
import {
  closeBans,
  goBans,
  inspectBan,
  onBansDelta,
  openHistory,
} from "./actions";
import { BanDetailsDialog } from "./BanDetailsDialog";
import { BanFormDialog } from "./BanFormDialog";
import { dateTime, endText, StatusChip, useServerNow } from "./parts";

/**
 * A character's Bans card: every ban of its account (newest first, live), each opening the details dialog, and the
 * Ban button (the player is dropped while online; offline the account's identifiers are banned).
 */
export function BansCard({ view, t }: { view: CharacterView; t: T }) {
  const history = useAppSelector((state) => state.bans.history);
  const now = useServerNow();
  const [banning, setBanning] = useState(false);
  useNuiEvent(NuiMessage.adminBans, onBansDelta);
  useEffect(() => {
    void openHistory(view.charId);
    return () => closeBans("history");
  }, [view.charId]);
  const rows = history?.charId === view.charId ? history.rows : null;
  return (
    <PCard
      icon={faGavel}
      title={t("ADMIN_BANS_C_HISTORY")}
      desc={t("ADMIN_BANS_C_HISTORY_DESC")}
    >
      {rows === null ? (
        <p className="text-[1.35vh] text-text-3">{t("ADMIN_BANS_LOADING")}</p>
      ) : rows.length === 0 ? (
        <p className="text-[1.35vh] text-text-3">
          {t("ADMIN_BANS_NO_HISTORY")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-white/6 rounded-[1vh] bg-black/20">
          {rows.map((ban) => (
            <button
              key={ban.id}
              type="button"
              onClick={() => inspectBan(ban)}
              className="group flex min-h-[5.2vh] items-center gap-[1.2vh] px-[1.4vh] py-[0.8vh] text-left transition-colors duration-150 outline-none hover:bg-white/4 focus-visible:bg-white/6"
            >
              <span className="flex w-[7.4vh] shrink-0">
                <StatusChip ban={ban} now={now} t={t} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
                <span className="truncate text-[1.35vh]">{ban.reason}</span>
                <span className="truncate text-[1.2vh] text-text-3">
                  #{ban.id} · {dateTime(ban.created)} · {endText(ban, now, t)}
                </span>
              </span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-[1.1vh] text-text-4 transition-colors duration-150 group-hover:text-text-2"
                aria-hidden
              />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button variant="danger" onClick={() => setBanning(true)}>
          <FontAwesomeIcon icon={faGavel} aria-hidden />
          {t("ADMIN_BANS_BAN")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => goBans(`fivem:${view.user.fivem}`)}
        >
          {t("ADMIN_BANS_OPEN_LIST")}
        </Button>
      </div>
      <BanFormDialog
        open={banning}
        onOpenChange={setBanning}
        charId={view.charId}
        name={`${view.firstname} ${view.lastname}`}
        t={t}
      />
      <BanDetailsDialog t={t} />
    </PCard>
  );
}
