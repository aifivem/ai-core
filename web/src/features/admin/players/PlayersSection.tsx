import { useEffect } from "react";
import { useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { NuiMessage } from "../../../../../resource/common/nui";
import { Button } from "../../../components/ui/button";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { useAppSelector } from "../../../store";
import {
  closeCharacter,
  closePlayers,
  goPlayers,
  onPlayersDelta,
  openCharacter,
  openPlayers,
} from "./actions";
import { BansCard } from "../bans/BansCard";
import { AccountCard, InfoCard } from "./InfoCard";
import { MemberCard } from "./MemberCard";
import { MetaCard } from "./MetaCard";
import { MoneyCard } from "./MoneyCard";
import { Chip, type T } from "./parts";
import { ActionsCard } from "./ActionsCard";
import { ItemsCard, PositionCard } from "./PlayerCards";
import { PlayersList } from "./PlayersList";

function CharacterPage({ t }: { t: T }) {
  const view = useAppSelector((state) => state.players.view);
  const status = useAppSelector((state) => state.players.status);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.4vh]">
      <div className="flex items-center gap-[1.4vh] pr-[1vh]">
        <Button variant="ghost" onClick={() => goPlayers()}>
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden />
          {t("ADMIN_PLAYERS_BACK")}
        </Button>
        {view && (
          <>
            <h2 className="truncate font-display text-[2vh] leading-none font-extrabold tracking-[-0.01em] uppercase">
              {view.firstname} {view.lastname}
            </h2>
            <span className="font-mono text-[1.3vh] text-text-3">
              #{view.citizenid}
            </span>
            {view.source !== null ? (
              <Chip tone="green">
                {t("ADMIN_PLAYERS_SERVER_ID", view.source)}
              </Chip>
            ) : (
              <Chip tone="grey">{t("ADMIN_PLAYERS_OFFLINE")}</Chip>
            )}
          </>
        )}
      </div>
      {status !== "shown" || !view ? (
        <p className="text-[1.4vh] text-text-3">
          {t(
            status === "gone"
              ? "ADMIN_PLAYERS_GONE_VIEW"
              : "ADMIN_PLAYERS_LOADING",
          )}
        </p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div
            key={view.charId}
            className="grid grid-cols-2 items-start gap-[1.6vh] pr-[1vh] pb-[1vh]"
          >
            <div className="flex flex-col gap-[1.6vh]">
              <InfoCard view={view} t={t} />
              <MoneyCard view={view} t={t} />
              <AccountCard view={view} t={t} />
            </div>
            <div className="flex flex-col gap-[1.6vh]">
              <MemberCard kind="job" view={view} t={t} />
              <MemberCard kind="gang" view={view} t={t} />
              <PositionCard view={view} t={t} />
              <ItemsCard view={view} t={t} />
              <ActionsCard view={view} t={t} />
              <BansCard view={view} t={t} />
              <MetaCard view={view} t={t} />
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

/**
 * The Players section (`/admin/players`, one character with `?char=`): subscribes on mount (online snapshot, then
 * the character's), applies the server's deltas, and unsubscribes when it closes.
 */
export function PlayersSection({
  char,
  t,
}: {
  char: number | undefined;
  t: T;
}) {
  useNuiEvent(NuiMessage.adminPlayers, onPlayersDelta);
  useEffect(() => {
    void openPlayers();
    return closePlayers;
  }, []);
  useEffect(() => {
    if (char === undefined) return;
    void openCharacter(char);
    return closeCharacter;
  }, [char]);
  return char === undefined ? <PlayersList t={t} /> : <CharacterPage t={t} />;
}
