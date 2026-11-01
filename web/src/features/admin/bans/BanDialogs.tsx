import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faUnlock } from "@fortawesome/free-solid-svg-icons";
import {
  BAN_IDENTIFIERS,
  banStatus,
  type BanIdentifier,
  type BanRecord,
} from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { useAppSelector } from "../../../store";
import { Note, Row, Rows, useAction, type T } from "../players/parts";
import { banSubject, editBan, inspectBan, unban } from "./actions";
import {
  dateTime,
  endText,
  FormRow,
  KEEP,
  LengthSelect,
  lengthMinutes,
  StatusChip,
  useServerNow,
  type LengthValue,
} from "./parts";

const ONE_DAY = "1440";
const reasonOk = (text: string): boolean => text.trim().length >= 3;

/**
 * A new ban: a character (`charId`, its player while online) or identifiers typed here (`charId` undefined). Closes
 * when the server took it; the ban arrives in the lists as a delta.
 */
export function BanFormDialog({
  open,
  onOpenChange,
  charId,
  name,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charId?: number;
  name?: string;
  t: T;
}) {
  const { busy, note, run } = useAction();
  const [reason, setReason] = useState("");
  const [length, setLength] = useState<LengthValue>(ONE_DAY);
  const [ids, setIds] = useState<Partial<Record<BanIdentifier, string>>>({});
  useEffect(() => {
    if (!open) return;
    setReason("");
    setLength(ONE_DAY);
    setIds({});
  }, [open]);
  const typed = Object.fromEntries(
    Object.entries(ids).filter(([, v]) => v?.trim()),
  ) as Partial<Record<BanIdentifier, string>>;
  const ready =
    reasonOk(reason) && (charId !== undefined || Object.keys(typed).length > 0);
  const send = async () => {
    const minutes = lengthMinutes(length);
    const ok = await run(() =>
      banSubject(
        charId !== undefined ? { charId } : { identifiers: typed },
        reason.trim(),
        minutes === false ? null : minutes,
      ),
    );
    if (ok) onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[56vh]"
      title={
        charId !== undefined
          ? t("ADMIN_BANS_BAN_TITLE", name ?? "")
          : t("ADMIN_BANS_NEW_TITLE")
      }
      description={t(
        charId !== undefined ? "ADMIN_BANS_BAN_DESC" : "ADMIN_BANS_NEW_DESC",
      )}
    >
      {charId === undefined && (
        <div className="grid grid-cols-2 gap-[1.2vh]">
          {BAN_IDENTIFIERS.map((type) => (
            <FormRow key={type} label={t(`ADMIN_BANS_I_${type.toUpperCase()}`)}>
              <Input
                value={ids[type] ?? ""}
                maxLength={64}
                placeholder={t(`ADMIN_BANS_I_${type.toUpperCase()}_HINT`)}
                onChange={(e) => setIds({ ...ids, [type]: e.target.value })}
              />
            </FormRow>
          ))}
        </div>
      )}
      <FormRow label={t("ADMIN_BANS_REASON")}>
        <Input
          value={reason}
          maxLength={255}
          autoFocus
          placeholder={t("ADMIN_BANS_REASON_HINT")}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormRow>
      <FormRow label={t("ADMIN_BANS_LENGTH")}>
        <LengthSelect value={length} onChange={setLength} t={t} />
      </FormRow>
      <Note note={note} t={t} />
      <div className="flex justify-end gap-[1vh]">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t("ADMIN_CANCEL")}
        </Button>
        <Button
          variant="destructive"
          disabled={!ready}
          busy={busy}
          onClick={() => void send()}
        >
          <FontAwesomeIcon icon={faGavel} aria-hidden />
          {t("ADMIN_BANS_CONFIRM")}
        </Button>
      </div>
    </Dialog>
  );
}

/** The inspected ban: every stored field; an active one can be changed (reason, new end) or lifted. */
export function BanDetailsDialog({ t }: { t: T }) {
  const ban = useAppSelector((state) => state.bans.inspected);
  // Keyed by id: another ban starts a fresh form, a delta of the same ban keeps what the admin typed.
  return ban ? <BanDetails key={ban.id} ban={ban} t={t} /> : null;
}

function BanDetails({ ban, t }: { ban: BanRecord; t: T }) {
  const now = useServerNow();
  const { busy, note, run } = useAction();
  const [reason, setReason] = useState(ban.reason);
  const [length, setLength] = useState<LengthValue>(KEEP);
  const [lifting, setLifting] = useState(false);
  const active = banStatus(ban, now) === "active";
  const changed = reason.trim() !== ban.reason || length !== KEEP;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && inspectBan(null)}
      className="w-[64vh]"
      title={t("ADMIN_BANS_DETAILS_TITLE", ban.id)}
    >
      <Rows>
        <Row label={t("ADMIN_BANS_STATE")}>
          <StatusChip ban={ban} now={now} t={t} />
          <span className="text-text-2">{endText(ban, now, t)}</span>
        </Row>
        <Row label={t("ADMIN_BANS_NAME")}>
          {ban.name || t("ADMIN_BANS_UNNAMED")}
        </Row>
        {BAN_IDENTIFIERS.map((type) =>
          ban.identifiers[type] ? (
            <Row
              key={type}
              label={t(`ADMIN_BANS_I_${type.toUpperCase()}`)}
              mono
            >
              {ban.identifiers[type]}
            </Row>
          ) : null,
        )}
        <Row label={t("ADMIN_BANS_REASON")}>{ban.reason}</Row>
        <Row label={t("ADMIN_BANS_BY")}>{ban.by || "-"}</Row>
        <Row label={t("ADMIN_BANS_CREATED")}>{dateTime(ban.created)}</Row>
        <Row label={t("ADMIN_BANS_ENDS")}>
          {ban.expires === null
            ? t("ADMIN_BANS_PERMANENT")
            : dateTime(ban.expires)}
        </Row>
        {ban.revoked !== null && (
          <Row label={t("ADMIN_BANS_REVOKED_BY")}>
            {ban.revokedBy ?? "-"} · {dateTime(ban.revoked)}
          </Row>
        )}
      </Rows>
      {active && (
        <div className="flex flex-col gap-[1.2vh] rounded-[1vh] bg-black/20 p-[1.4vh]">
          <span className="text-[1.3vh] font-semibold">
            {t("ADMIN_BANS_CHANGE")}
          </span>
          <div className="grid grid-cols-[1fr_20vh] gap-[1.2vh]">
            <FormRow label={t("ADMIN_BANS_REASON")}>
              <Input
                value={reason}
                maxLength={255}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormRow>
            <FormRow label={t("ADMIN_BANS_NEW_END")}>
              <LengthSelect value={length} onChange={setLength} keep t={t} />
            </FormRow>
          </div>
        </div>
      )}
      <Note note={note} t={t} />
      <div className="flex items-center justify-end gap-[1vh]">
        {active && !lifting && (
          <Button variant="danger" onClick={() => setLifting(true)}>
            <FontAwesomeIcon icon={faUnlock} aria-hidden />
            {t("ADMIN_BANS_UNBAN")}
          </Button>
        )}
        {active && lifting && (
          <>
            <span className="mr-auto text-[1.3vh] text-text-2">
              {t("ADMIN_BANS_UNBAN_CONFIRM")}
            </span>
            <Button variant="ghost" onClick={() => setLifting(false)}>
              {t("ADMIN_CANCEL")}
            </Button>
            <Button
              variant="destructive"
              busy={busy}
              onClick={() => void run(() => unban(ban.id))}
            >
              {t("ADMIN_BANS_UNBAN")}
            </Button>
          </>
        )}
        {!lifting && (
          <>
            <Button variant="ghost" onClick={() => inspectBan(null)}>
              {t("ADMIN_CLOSE")}
            </Button>
            {active && (
              <Button
                variant="primary"
                disabled={!changed || !reasonOk(reason)}
                busy={busy}
                onClick={() =>
                  void run(() =>
                    editBan(ban.id, reason.trim(), lengthMinutes(length)),
                  ).then((ok) => ok && setLength(KEEP))
                }
              >
                {t("ADMIN_BANS_SAVE")}
              </Button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
