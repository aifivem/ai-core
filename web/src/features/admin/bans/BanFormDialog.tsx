import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel } from "@fortawesome/free-solid-svg-icons";
import { BAN_IDENTIFIERS, type BanIdentifier } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Note, useAction, type T } from "../players/parts";
import { banSubject } from "./actions";
import {
  FormRow,
  LengthSelect,
  lengthMinutes,
  reasonOk,
  type LengthValue,
} from "./parts";

const ONE_DAY = "1440";

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
