import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingMedical,
  faRightFromBracket,
  faSkull,
  faTrash,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { goPlayers, runAction } from "./actions";
import { Note, PCard, useAction, type T } from "./parts";

/** Revive, kill and kick (online), delete (offline), each risky one behind a confirm dialog. */
export function ActionsCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const [dialog, setDialog] = useState<"kill" | "kick" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const online = view.source !== null;
  const name = `${view.firstname} ${view.lastname}`;
  const confirm = async () => {
    const kind = dialog;
    setDialog(null);
    if (kind === "kill") await run(() => runAction("kill", [view.charId]));
    if (kind === "kick")
      await run(() => runAction("kick", [view.charId, reason.trim()]));
    if (
      kind === "delete" &&
      (await run(() => runAction("delete", [view.charId])))
    )
      goPlayers();
  };
  return (
    <PCard
      icon={faUserShield}
      title={t("ADMIN_PLAYERS_C_ACTIONS")}
      desc={t("ADMIN_PLAYERS_C_ACTIONS_DESC")}
    >
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button
          disabled={!online}
          busy={busy}
          onClick={() => void run(() => runAction("revive", [view.charId]))}
        >
          <FontAwesomeIcon icon={faHandHoldingMedical} aria-hidden />
          {t("ADMIN_PLAYERS_REVIVE")}
        </Button>
        <Button
          variant="danger"
          disabled={!online}
          onClick={() => setDialog("kill")}
        >
          <FontAwesomeIcon icon={faSkull} aria-hidden />
          {t("ADMIN_PLAYERS_KILL")}
        </Button>
        <Button
          variant="danger"
          disabled={!online}
          onClick={() => {
            setReason("");
            setDialog("kick");
          }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} aria-hidden />
          {t("ADMIN_PLAYERS_KICK")}
        </Button>
        <Button
          variant="danger"
          disabled={online}
          title={online ? t("ADMIN_PLAYERS_DELETE_ONLINE") : undefined}
          onClick={() => setDialog("delete")}
        >
          <FontAwesomeIcon icon={faTrash} aria-hidden />
          {t("ADMIN_PLAYERS_DELETE")}
        </Button>
        <Note note={note} t={t} />
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t(
          dialog === "kill"
            ? "ADMIN_PLAYERS_KILL_TITLE"
            : dialog === "kick"
              ? "ADMIN_PLAYERS_KICK_TITLE"
              : "ADMIN_PLAYERS_DELETE_TITLE",
          name,
        )}
        description={
          dialog === "delete"
            ? t("ADMIN_PLAYERS_DELETE_DESC")
            : dialog === "kill"
              ? t("ADMIN_PLAYERS_KILL_DESC")
              : undefined
        }
      >
        {dialog === "kick" && (
          <Input
            value={reason}
            maxLength={120}
            autoFocus
            placeholder={t("ADMIN_PLAYERS_KICK_REASON")}
            aria-label={t("ADMIN_PLAYERS_KICK_REASON")}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-[1vh]">
          <Button variant="ghost" onClick={() => setDialog(null)}>
            {t("ADMIN_CANCEL")}
          </Button>
          <Button variant="destructive" onClick={() => void confirm()}>
            {t(
              dialog === "kill"
                ? "ADMIN_PLAYERS_KILL"
                : dialog === "kick"
                  ? "ADMIN_PLAYERS_KICK"
                  : "ADMIN_PLAYERS_DELETE",
            )}
          </Button>
        </div>
      </Dialog>
    </PCard>
  );
}
