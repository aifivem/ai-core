import { registerExport } from "@aicore-fivem/lib/server";
import { accountTypes, gangs as gangDefs, jobs as jobDefs } from "./content";
import { dutyCount } from "./jobs/dutyCount";
import { sharedAccounts } from "./money/book";
import { transferMoney } from "./money/transfer";
import { players } from "./player/registry";

/**
 * Server exports. All synchronous and small (callers mirror what they need and follow the local events);
 * typed in @aicore-fivem/shared `AiCoreExports`. Amounts are whole numbers; `reason` is a short lang key or tag.
 */

const positive = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0;
const reasonOf = (reason: unknown): string =>
  typeof reason === "string" && reason
    ? reason
    : GetInvokingResource() || "unknown";

registerExport(
  "GetPlayerData",
  (src: number) => players.get(src)?.snapshot() ?? null,
);
registerExport(
  "GetCharacter",
  (src: number) => players.get(src)?.info() ?? null,
);
registerExport(
  "GetSourceByCharId",
  (charId: number) => players.byCharacter(charId)?.source ?? null,
);
registerExport(
  "GetSourceByCitizenId",
  (citizenid: string) => players.byCitizen(citizenid)?.source ?? null,
);
registerExport("GetLoadedSources", () =>
  [...players.all()].map((player) => player.source),
);
registerExport(
  "GetFivemId",
  (src: number) => players.get(src)?.user.fivem ?? null,
);

registerExport(
  "GetMoney",
  (src: number, account: string) =>
    players.get(src)?.wallet.get(account) ?? null,
);
registerExport(
  "AddMoney",
  (src: number, account: string, amount: number, reason?: string) =>
    positive(amount)
      ? (players.get(src)?.wallet.change(account, amount, reasonOf(reason))
          .ok ?? false)
      : false,
);
registerExport(
  "RemoveMoney",
  (src: number, account: string, amount: number, reason?: string) =>
    positive(amount)
      ? (players.get(src)?.wallet.change(account, -amount, reasonOf(reason))
          .ok ?? false)
      : false,
);
registerExport(
  "SetMoney",
  (src: number, account: string, amount: number, reason?: string) =>
    players.get(src)?.wallet.set(account, amount, reasonOf(reason)).ok ?? false,
);

registerExport(
  "GetJobs",
  (src: number) => players.get(src)?.jobs.all() ?? null,
);
registerExport(
  "GetCurrentJob",
  (src: number) => players.get(src)?.jobs.current() ?? null,
);
registerExport(
  "GetDutyJob",
  (src: number) => players.get(src)?.jobs.onDuty() ?? null,
);
registerExport(
  "SetDuty",
  (src: number, job: string | null) =>
    players.get(src)?.jobs.setDuty(job).ok ?? false,
);
registerExport(
  "SetJob",
  (src: number, job: string, grade: number) =>
    players.get(src)?.jobs.set(job, grade).ok ?? false,
);
registerExport(
  "RemoveJob",
  (src: number, job: string) => players.get(src)?.jobs.remove(job).ok ?? false,
);
registerExport("GetOnDutyCount", (job: string) => dutyCount(job));

registerExport(
  "GetGangs",
  (src: number) => players.get(src)?.gangs.all() ?? null,
);
registerExport(
  "GetActiveGang",
  (src: number) => players.get(src)?.gangs.activeGang() ?? null,
);
registerExport(
  "SetGang",
  (src: number, gang: string, grade: number) =>
    players.get(src)?.gangs.set(gang, grade).ok ?? false,
);
registerExport(
  "RemoveGang",
  (src: number, gang: string) =>
    players.get(src)?.gangs.remove(gang).ok ?? false,
);
registerExport(
  "SetActiveGang",
  (src: number, gang: string | null) =>
    players.get(src)?.gangs.setActive(gang).ok ?? false,
);

registerExport(
  "GetMeta",
  (src: number, key: string) => players.get(src)?.getMeta(key) ?? null,
);
registerExport("SetMeta", (src: number, key: string, value: unknown) => {
  const player = players.get(src);
  if (!player || typeof key !== "string") return false;
  player.setMeta(key, value);
  return true;
});

registerExport("GetJobDefinitions", () => Object.fromEntries(jobDefs));
registerExport("GetGangDefinitions", () => Object.fromEntries(gangDefs));
registerExport("GetAccountTypes", () => Object.fromEntries(accountTypes));

/** Job and gang accounts (society money); loaded at start, so these stay synchronous. */
registerExport(
  "GetSharedMoney",
  (ownerType: "job" | "gang", ownerId: string, account: string) =>
    sharedAccounts.get(ownerType, ownerId, account)?.balance ?? null,
);
registerExport(
  "AddSharedMoney",
  (
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ) =>
    positive(amount)
      ? (sharedAccounts
          .get(ownerType, ownerId, account)
          ?.change(amount, reasonOf(reason)).ok ?? false)
      : false,
);
registerExport(
  "RemoveSharedMoney",
  (
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ) =>
    positive(amount)
      ? (sharedAccounts
          .get(ownerType, ownerId, account)
          ?.change(-amount, reasonOf(reason)).ok ?? false)
      : false,
);

/** One transfer between any two accounts (a player's, a job's, a gang's) in one DB transaction with both ledger rows. */
registerExport(
  "TransferMoney",
  (
    from: unknown,
    to: unknown,
    amount: unknown,
    reason?: unknown,
    fee?: unknown,
  ) => transferMoney(from, to, amount, reasonOf(reason), fee ?? 0),
);
