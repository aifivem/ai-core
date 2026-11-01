import { banStatus, type BanRecord } from "@aicore-fivem/shared";
import type { BansAction } from "../../../resource/common/adminBans";

/**
 * Browser preview only: answers of the ban screens (`?view=admin#/admin/bans`, a character's card on
 * `#/admin/players?char=3`). 120 bans in every state; pages of 50 by id; edits answer ok without a delta, `&error=1`
 * refuses them.
 */
const refuse = new URLSearchParams(window.location.search).get("error") === "1";

const NAMES = [
  "Marcus Reed",
  "lena_ok",
  "Tony V",
  "xX_Sniper_Xx",
  "Dmitri",
  "sofia.mq",
  "JamalB",
  "Hana",
];
const REASONS = [
  "Cheating: speed hack seen by three admins",
  "Combat logging during a police chase",
  "Racism in OOC chat",
  "RDM, several players",
  "Exploiting the bank robbery door",
  "Ban evasion (second account)",
];
const HOUR = 3_600_000;
const now = Date.now();

const bans: BanRecord[] = Array.from({ length: 120 }, (_, i) => {
  const id = 120 - i;
  const created = now - i * 7 * HOUR;
  const kind = i % 5;
  const name = NAMES[i % NAMES.length] ?? "";
  return {
    id,
    identifiers: {
      fivem: String(100_000 + i),
      license: (0xabcdef + i).toString(16).padStart(40, "0"),
      ...(i % 3 === 0 ? { discord: String(300_000_000_000_000_000 + i) } : {}),
      ...(i % 4 === 0 ? { ip: `85.104.${i}.12` } : {}),
    },
    name,
    reason: REASONS[i % REASONS.length] ?? "",
    by: i % 2 ? "Burak (fivem:12)" : "ai-anticheat",
    created,
    // 0 permanent, 1 / 2 timed and running, 3 timed and over, 4 lifted.
    expires:
      kind === 0
        ? null
        : kind === 3
          ? created + HOUR
          : created + (kind === 1 ? 30 : 400) * 24 * HOUR,
    revoked: kind === 4 ? created + 2 * HOUR : null,
    revokedBy: kind === 4 ? "Burak (fivem:12)" : null,
  };
});

function list(query: unknown): unknown {
  const q = (typeof query === "object" && query !== null ? query : {}) as {
    filter?: string;
    search?: string;
    cursor?: { id: number } | null;
  };
  const term = (q.search ?? "").trim().toLowerCase();
  const rows = bans.filter(
    (b) =>
      (q.filter === "all" || banStatus(b, Date.now()) === q.filter) &&
      (!term ||
        b.name.toLowerCase().startsWith(term) ||
        String(b.id) === term ||
        Object.values(b.identifiers).some((v) => term.endsWith(v))) &&
      b.id < (q.cursor?.id ?? Infinity),
  );
  const page = rows.slice(0, 50);
  const last = page.at(-1);
  return {
    bans: page,
    next: rows.length > 50 && last ? { id: last.id, at: null } : null,
    now: Date.now(),
  };
}

export function mockBans(action: BansAction, args: unknown[]): unknown {
  switch (action) {
    case "list":
      return list(args[0]);
    case "history":
      return {
        bans: bans.filter((_, i) => i % 9 === 0).slice(0, 4),
        now: Date.now(),
      };
    case "close":
      return { ok: true };
    default:
      return refuse
        ? { ok: false, error: "ADMIN_BANS_ERR_GONE" }
        : { ok: true };
  }
}
