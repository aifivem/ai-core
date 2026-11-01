import { caller, registerExport } from "@aicore-fivem/lib/server";
import {
  accountTypes,
  gangs as gangDefs,
  jobs as jobDefs,
  settings,
} from "./content";
import { dutyCount } from "./jobs/dutyCount";
import { sharedAccounts } from "./money/book";
import { transferMoney } from "./money/transfer";
import { players, selecting } from "./player/registry";
import {
  banHistory,
  banPlayer,
  editBan,
  findBans,
  getBans,
  isBanned,
  unbanPlayer,
} from "./bans";
import { toCharId } from "./characters/edit";
import { deleteCharacterBy, setCharacterInfo } from "./characters/manage";
import { getCharactersOfUser, getOfflineCharacter } from "./characters/read";
import {
  answer,
  offlineGang,
  offlineJob,
  offlineMeta,
  offlineMoney,
  offlineRemoveGang,
  offlineRemoveJob,
} from "./characters/writes";
import { membersOf } from "./jobs/members";
import { runtimeGangs, runtimeJobs } from "./jobs/runtime";
import {
  getPlayTime,
  isPaycheckEnabled,
  savePlayer,
  setPaycheckEnabled,
} from "./player/extras";

/**
 * Server exports. All synchronous and small (callers mirror what they need and follow the local events);
 * typed in @aicore-fivem/shared `AiCoreExports`. Amounts are whole numbers; `reason` is a short lang key or tag.
 */

const positive = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0;
const reasonOf = (reason: unknown): string =>
  typeof reason === "string" && reason ? reason : caller();

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
/** The account id (`ai_core_users.id`) of a connected player, also on the character screen. */
registerExport(
  "GetUserId",
  (src: number) => players.get(src)?.user.id ?? selecting.get(src)?.id ?? null,
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

registerExport("GetBranding", () => ({ ...settings.branding }));
registerExport("GetJobDefinitions", () => Object.fromEntries(jobDefs));
registerExport("GetGangDefinitions", () => Object.fromEntries(gangDefs));
registerExport("GetJobDefinition", (job: unknown) =>
  typeof job === "string" ? (jobDefs.get(job) ?? null) : null,
);
registerExport("GetGangDefinition", (gang: unknown) =>
  typeof gang === "string" ? (gangDefs.get(gang) ?? null) : null,
);
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

// Stored characters (loaded ones answer from memory / change through their Player): `characters/`.
registerExport("GetOfflineCharacter", (charId: unknown, done: unknown) => {
  const id = toCharId(charId);
  const work = id === null ? Promise.resolve(null) : getOfflineCharacter(id);
  answer(`character #${id}`, work, done, null);
});
registerExport("GetCharactersOfUser", (user: unknown, done: unknown) =>
  answer("characters of an account", getCharactersOfUser(user), done, []),
);
registerExport(
  "GetJobMembers",
  (job: unknown, done: unknown, after?: unknown, limit?: unknown) =>
    answer("job members", membersOf("job", job, after, limit), done, {
      members: [],
      next: null,
    }),
);
registerExport(
  "GetGangMembers",
  (gang: unknown, done: unknown, after?: unknown, limit?: unknown) =>
    answer("gang members", membersOf("gang", gang, after, limit), done, {
      members: [],
      next: null,
    }),
);
registerExport(
  "AddOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("add", c, a, n, r, done),
);
registerExport(
  "RemoveOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("remove", c, a, n, r, done),
);
registerExport(
  "SetOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("set", c, a, n, r, done),
);
registerExport("SetOfflineJob", offlineJob);
registerExport("RemoveOfflineJob", offlineRemoveJob);
registerExport("SetOfflineGang", offlineGang);
registerExport("RemoveOfflineGang", offlineRemoveGang);
registerExport("SetOfflineMeta", offlineMeta);
registerExport("SetCharacterInfo", setCharacterInfo);
registerExport(
  "DeleteCharacter",
  (charId: unknown, by?: unknown, done?: unknown) =>
    deleteCharacterBy(charId, by, done),
);

// Bans: `bans/`.
registerExport(
  "BanPlayer",
  (
    target: unknown,
    reason: unknown,
    minutes?: unknown,
    by?: unknown,
    done?: unknown,
  ) => banPlayer(target, reason, minutes, by, done),
);
registerExport("UnbanPlayer", (banId: unknown, by?: unknown) =>
  unbanPlayer(banId, by),
);
registerExport("IsBanned", isBanned);
registerExport("GetBans", (page?: unknown) => getBans(page));
registerExport("GetBanHistory", (target: unknown, done: unknown) =>
  answer("ban history", banHistory(target), done, []),
);
registerExport("ListBans", (query: unknown, done: unknown) =>
  answer("ban list", findBans(query), done, null),
);
registerExport("EditBan", (banId: unknown, edit: unknown, by?: unknown) =>
  editBan(banId, edit, by),
);

// Job and gang definitions of scripts (owned by the caller, gone when it stops): `jobs/runtime.ts`.
registerExport("RegisterJobDefinition", (name: unknown, def: unknown) =>
  runtimeJobs.register(name, def),
);
registerExport("RemoveJobDefinition", (name: unknown) =>
  runtimeJobs.remove(name),
);
registerExport("RegisterGangDefinition", (name: unknown, def: unknown) =>
  runtimeGangs.register(name, def),
);
registerExport("RemoveGangDefinition", (name: unknown) =>
  runtimeGangs.remove(name),
);

// Player extras: `player/extras.ts`.
registerExport("SetPaycheckEnabled", setPaycheckEnabled);
registerExport("IsPaycheckEnabled", isPaycheckEnabled);
registerExport("GetPlayTime", (target: unknown, done?: unknown) =>
  getPlayTime(target, done),
);
registerExport("SavePlayer", (source: unknown, done?: unknown) =>
  savePlayer(source, done),
);
