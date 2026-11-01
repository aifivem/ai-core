import { useEffect, useState, type ReactNode } from "react";
import {
  BAN_DURATIONS,
  banStatus,
  type BanRecord,
  type BanStatus,
} from "@aicore-fivem/shared";
import { Select } from "../../../components/ui/select";
import { Chip, type T } from "../players/parts";
import { clock } from "./actions";

/** The server's time now, again every 30 s while mounted (states and time left run on the client clock). */
export function useServerNow(): number {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(clock.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const TONE: Record<BanStatus, "red" | "grey" | "green"> = {
  active: "red",
  expired: "grey",
  revoked: "green",
};

export function StatusChip({
  ban,
  now,
  t,
}: {
  ban: BanRecord;
  now: number;
  t: T;
}) {
  const status = banStatus(ban, now);
  return (
    <Chip tone={TONE[status]}>{t(`ADMIN_BANS_S_${status.toUpperCase()}`)}</Chip>
  );
}

export const dateTime = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** Time left as "3 d 4 h", "5 h 20 min" or "12 min". */
function left(ms: number, t: T): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0)
    return h > 0
      ? `${t("ADMIN_BANS_DAYS", d)} ${t("ADMIN_BANS_HOURS", h)}`
      : t("ADMIN_BANS_DAYS", d);
  if (h > 0)
    return m > 0
      ? `${t("ADMIN_BANS_HOURS", h)} ${t("ADMIN_BANS_MINUTES", m)}`
      : t("ADMIN_BANS_HOURS", h);
  return t("ADMIN_BANS_MINUTES", m);
}

/** When the ban ends (or ended / was lifted), in words. */
export function endText(ban: BanRecord, now: number, t: T): string {
  if (ban.revoked !== null)
    return t("ADMIN_BANS_LIFTED_ON", dateTime(ban.revoked));
  if (ban.expires === null) return t("ADMIN_BANS_PERMANENT");
  return ban.expires <= now
    ? t("ADMIN_BANS_ENDED", dateTime(ban.expires))
    : t("ADMIN_BANS_LEFT", left(ban.expires - now, t));
}

/** A ban's name, or its first identifier when it was made without one. */
export function banTitle(ban: BanRecord, t: T): string {
  if (ban.name) return ban.name;
  const [type, value] = Object.entries(ban.identifiers)[0] ?? [];
  return type && value ? `${type}:${value}` : t("ADMIN_BANS_UNNAMED");
}

/** Lengths as select values: minutes, "perm" for permanent, "keep" for the edit's "keep the end". */
export type LengthValue = string;
export const PERMANENT = "perm";
export const KEEP = "keep";

export function lengthMinutes(value: LengthValue): number | null | false {
  if (value === KEEP) return false;
  if (value === PERMANENT) return null;
  return Number(value);
}

export function LengthSelect({
  value,
  onChange,
  keep,
  t,
}: {
  value: LengthValue;
  onChange: (value: LengthValue) => void;
  /** Offer "keep the end" (changing a ban). */
  keep?: boolean;
  t: T;
}) {
  const options = BAN_DURATIONS.map((d) => ({
    value: d.minutes === null ? PERMANENT : String(d.minutes),
    label: t(`ADMIN_BANS_D_${d.id}`),
  }));
  return (
    <Select
      value={value}
      onChange={onChange}
      aria-label={t("ADMIN_BANS_LENGTH")}
      options={
        keep
          ? [{ value: KEEP, label: t("ADMIN_BANS_KEEP_END") }, ...options]
          : options
      }
    />
  );
}

/** A labelled form row of the ban dialogs. */
export function FormRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.7vh]">
      <span className="text-[1.25vh] font-medium text-text-3">{label}</span>
      {children}
    </div>
  );
}

/** A ban reason needs at least three characters. */
export const reasonOk = (text: string): boolean => text.trim().length >= 3;
