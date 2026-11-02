import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandcuffs, faXmark } from "@fortawesome/free-solid-svg-icons";
import { WARRANT_DURATIONS, type Warrant } from "@aifivem/shared";
import type { CharacterView } from "../../../../../resource/common/adminPlayers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { dateTime } from "../bans/parts";
import { runAction } from "./actions";
import { Note, PCard, useAction, type T } from "./parts";

/** Select values: minutes, or "until" for until cleared. */
const UNTIL = "until";
const ONE_DAY = "1440";

function endText(warrant: Warrant, t: T): string {
  return warrant.expires === null
    ? t("ADMIN_WARRANTS_UNTIL_CLEARED")
    : t("ADMIN_WARRANTS_ENDS", dateTime(warrant.expires));
}

function WarrantRow({
  warrant,
  charId,
  t,
}: {
  warrant: Warrant;
  charId: number;
  t: T;
}) {
  const { busy, note, run } = useAction();
  return (
    <div className="flex min-h-[5.2vh] items-center gap-[1.2vh] px-[1.4vh] py-[0.8vh]">
      <span className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
        <span className="truncate text-[1.35vh]">{warrant.reason}</span>
        <span className="truncate text-[1.2vh] text-text-3">
          #{warrant.id} · {t("ADMIN_WARRANTS_BY", warrant.by || "-")} ·{" "}
          {dateTime(warrant.created)} · {endText(warrant, t)}
        </span>
        <Note note={note} t={t} />
      </span>
      <Button
        size="sm"
        variant="ghost"
        busy={busy}
        onClick={() =>
          void run(() => runAction("clearWarrant", [charId, warrant.id]))
        }
      >
        <FontAwesomeIcon icon={faXmark} aria-hidden />
        {t("ADMIN_WARRANTS_CLEAR")}
      </Button>
    </div>
  );
}

/**
 * ai-core's own warrants of the character (live: the list follows as a `char` patch after each change, whoever made
 * it), each clearable, and the form that issues one (reason, length).
 */
export function WarrantsCard({ view, t }: { view: CharacterView; t: T }) {
  const { busy, note, run } = useAction();
  const [reason, setReason] = useState("");
  const [length, setLength] = useState(ONE_DAY);
  const issue = async () => {
    const minutes = length === UNTIL ? null : Number(length);
    const ok = await run(() =>
      runAction("warrant", [view.charId, reason.trim(), minutes]),
    );
    if (ok) setReason("");
  };
  return (
    <PCard
      icon={faHandcuffs}
      title={t("ADMIN_WARRANTS_C")}
      desc={t("ADMIN_WARRANTS_C_DESC")}
    >
      {view.warrants.length === 0 ? (
        <p className="text-[1.35vh] text-text-3">{t("ADMIN_WARRANTS_NONE")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/6 rounded-[1vh] bg-black/20">
          {view.warrants.map((warrant) => (
            <WarrantRow
              key={warrant.id}
              warrant={warrant}
              charId={view.charId}
              t={t}
            />
          ))}
        </div>
      )}
      <div className="grid grid-cols-[1fr_16vh] gap-[1vh]">
        <Input
          value={reason}
          maxLength={255}
          placeholder={t("ADMIN_WARRANTS_REASON_PH")}
          aria-label={t("ADMIN_WARRANTS_REASON")}
          onChange={(e) => setReason(e.target.value)}
        />
        <Select
          value={length}
          aria-label={t("ADMIN_WARRANTS_LENGTH")}
          options={WARRANT_DURATIONS.map((d) => ({
            value: d.minutes === null ? UNTIL : String(d.minutes),
            label: t(`ADMIN_WARRANTS_D_${d.id}`),
          }))}
          onChange={setLength}
        />
      </div>
      <div className="flex flex-wrap items-center gap-[1vh]">
        <Button
          variant="primary"
          disabled={reason.trim().length < 3}
          busy={busy}
          onClick={() => void issue()}
        >
          <FontAwesomeIcon icon={faHandcuffs} aria-hidden />
          {t("ADMIN_WARRANTS_ADD")}
        </Button>
        <Note note={note} t={t} />
      </div>
    </PCard>
  );
}
