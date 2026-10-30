import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faHandHoldingMedical,
  faLocationDot,
  faPersonWalkingArrowRight,
  faRightFromBracket,
  faSkull,
  faTrash,
  faUserShield,
  faCubes,
} from "@fortawesome/free-solid-svg-icons";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { LookupBox } from "../widgets/lookup";
import { goPlayers, openInventory, runAction } from "./actions";
import { Note, PCard, Row, Rows, useAction, type T } from "./parts";

const fixed = (n: number): string => n.toFixed(2);

/** Where the character is (or spawns next), Go to and Bring. */
export function PositionCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const p = view.position;
  return (
    <PCard
      icon={faLocationDot}
      title={t("ADMIN_PLAYERS_C_POSITION")}
      desc={t("ADMIN_PLAYERS_C_POSITION_DESC")}
    >
      <Rows>
        <Row label="x / y / z" mono>
          {p
            ? `${fixed(p.x)} / ${fixed(p.y)} / ${fixed(p.z)}`
            : t("ADMIN_PLAYERS_NO_POSITION")}
        </Row>
      </Rows>
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button
          disabled={!p}
          busy={busy}
          onClick={() => void run(() => runAction("goto", [view.charId]))}
        >
          <FontAwesomeIcon icon={faPersonWalkingArrowRight} aria-hidden />
          {t("ADMIN_PLAYERS_GOTO")}
        </Button>
        <Button
          busy={busy}
          onClick={() => void run(() => runAction("bring", [view.charId]))}
        >
          <FontAwesomeIcon icon={faUserShield} aria-hidden />
          {t("ADMIN_PLAYERS_BRING")}
        </Button>
        <Note note={note} t={t} />
      </div>
    </PCard>
  );
}

/** Give or take an item of the running inventory, open the inventory (online only). */
export function ItemsCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const [query, setQuery] = useState("");
  const [item, setItem] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const online = view.source !== null;
  const n = Number(count);
  const ready = online && item !== null && Number.isInteger(n) && n >= 1;
  const send = (mode: "give" | "remove") =>
    void run(() => runAction("item", [view.charId, item, n, mode]));
  return (
    <PCard
      icon={faCubes}
      title={t("ADMIN_PLAYERS_C_ITEMS")}
      desc={
        online
          ? t("ADMIN_PLAYERS_C_ITEMS_DESC")
          : t("ADMIN_PLAYERS_ONLINE_ONLY")
      }
    >
      <div className="flex items-center gap-[1vh]">
        <div className="min-w-0 flex-1">
          <LookupBox
            source="item"
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setItem(null);
            }}
            onPick={(o) => {
              setItem(o.value);
              setQuery(o.label);
            }}
            empty={t("ADMIN_NO_MATCH")}
            anchor={(input) => (
              <Input
                {...input}
                disabled={!online}
                onChange={(e) => input.onChange(e.target.value)}
                placeholder={t("ADMIN_PLAYERS_ITEM")}
              />
            )}
          />
        </div>
        <Input
          className="w-[10vh]"
          inputMode="numeric"
          value={count}
          disabled={!online}
          aria-label={t("ADMIN_PLAYERS_COUNT")}
          onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button disabled={!ready} busy={busy} onClick={() => send("give")}>
          {t("ADMIN_PLAYERS_GIVE")}
        </Button>
        <Button disabled={!ready} busy={busy} onClick={() => send("remove")}>
          {t("ADMIN_PLAYERS_TAKE")}
        </Button>
        <Button
          variant="ghost"
          disabled={!online}
          onClick={() => void run(() => openInventory(view.charId))}
        >
          <FontAwesomeIcon icon={faBoxOpen} aria-hidden />
          {t("ADMIN_PLAYERS_INVENTORY")}
        </Button>
        <Note note={note} t={t} />
      </div>
    </PCard>
  );
}

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
