import type { BanInfo } from "@aicore-fivem/shared";
import { Locale } from "common";
import { BanStore } from "./store";

/** The active bans in memory (read once at start by `index.ts`), by identifier; the gate and `IsBanned` read only these. */
export const activeBans = new BanStore();

const pad = (n: number): string => String(n).padStart(2, "0");
/** Server local time `YYYY-MM-DD HH:MM`, or the permanent text. */
function expiryText(expires: number | null): string {
  if (expires === null) return Locale("BAN_PERMANENT");
  const d = new Date(expires);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const refusal = (ban: BanInfo): string =>
  Locale("BAN_REFUSED", ban.reason, expiryText(ban.expires), ban.id || "-");
