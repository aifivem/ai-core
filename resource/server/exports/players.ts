import { registerExport } from "@aicore-fivem/lib/server";
import { dutyCount } from "../jobs/dutyCount";
import { players, selecting } from "../player/registry";
import { positive, reasonOf } from "./args";

/** Exports of loaded players: data, money, jobs, gangs and metadata (answered from memory). */

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
