import type { CharacterInfo } from "@aicore-fivem/shared";
import type { MoneyMode, Position, PlayersResult } from "common/adminPlayers";
import { findCharacter } from "../../characters/repo";
import { gangs as gangDefs, jobs as jobDefs, settings } from "../../content";
import {
  deleteGang,
  deleteJob,
  loadGangs,
  loadJobs,
  saveActiveGang,
  saveGangMembership,
  saveJob,
  saveOnlyJob,
} from "../../jobs/repo";
import { loadAccounts } from "../../money/book";
import { moneyWriter } from "../../money/writer";
import { updateInfo, updateMetadata, updatePosition } from "./repo";
import { charWatchers } from "./charWatchers";

/**
 * Edits of a character that is not loaded. The caller holds the character (`claims.run`), so it cannot load while
 * these run; each applies the same rules a loaded character's sets apply and tells the watchers after the write.
 */

export const OK: PlayersResult = { ok: true };
export const fail = (error: string): PlayersResult => ({ ok: false, error });

/** JobSet / GangSet / Account refusals as panel lang keys. */
export const CHANGE_ERRORS: Record<string, string> = {
  UNKNOWN_JOB: "ADMIN_PLAYERS_ERR_JOB",
  UNKNOWN_GANG: "ADMIN_PLAYERS_ERR_GANG",
  INVALID_GRADE: "ADMIN_PLAYERS_ERR_GRADE",
  LIMIT: "ADMIN_PLAYERS_ERR_LIMIT",
  NOT_MEMBER: "ADMIN_PLAYERS_ERR_NOT_MEMBER",
  NO_ACCOUNT: "ADMIN_PLAYERS_ERR_ACCOUNT",
  INVALID_AMOUNT: "ADMIN_PLAYERS_ERR_AMOUNT",
  INSUFFICIENT_FUNDS: "ADMIN_PLAYERS_ERR_FUNDS",
};
export const changeError = (error: string): PlayersResult =>
  fail(CHANGE_ERRORS[error] ?? "ADMIN_PLAYERS_ERR_BUSY");

const gradeOk = (grades: number, grade: number): boolean =>
  Number.isInteger(grade) && grade >= 0 && grade < grades;

export const offline = {
  /**
   * Through the money API: the account object writes the balance delta and the ledger row like any change. Answers
   * the batch's real outcome; the account object is thrown away, so a rolled-back change leaves no balance anywhere
   * and the watchers hear only a committed one.
   */
  async money(
    charId: number,
    name: string,
    mode: MoneyMode,
    amount: number,
    reason: string,
    actor: string,
  ): Promise<PlayersResult> {
    const account = (await loadAccounts("character", String(charId))).get(name);
    if (!account) return changeError("NO_ACCOUNT");
    const result =
      mode === "set"
        ? account.set(amount, reason, actor)
        : account.change(mode === "add" ? amount : -amount, reason, actor);
    if (!result.ok) return changeError(result.error);
    if (!(await moneyWriter.commit())) return fail("ADMIN_PLAYERS_ERR_WRITE");
    charWatchers.money(charId, name, result.balance);
    return OK;
  },

  async setJob(
    charId: number,
    job: string,
    grade: number,
  ): Promise<PlayersResult> {
    const def = jobDefs.get(job);
    if (!def) return changeError("UNKNOWN_JOB");
    if (!gradeOk(def.grades.length, grade)) return changeError("INVALID_GRADE");
    let list = await loadJobs(charId);
    const existing = list.find((m) => m.job === job);
    const only = !existing && !settings.jobs.multiJob;
    if (existing) existing.grade = grade;
    else {
      if (only) list = [];
      else if (list.length >= settings.jobs.maxJobs)
        return changeError("LIMIT");
      list.push({ job, grade });
    }
    if (only) await saveOnlyJob(charId, job, grade);
    else await saveJob(charId, job, grade);
    charWatchers.char(charId, { jobs: list });
    return OK;
  },

  async removeJob(charId: number, job: string): Promise<PlayersResult> {
    const list = await loadJobs(charId);
    if (!list.some((m) => m.job === job)) return changeError("NOT_MEMBER");
    await deleteJob(charId, job);
    charWatchers.char(charId, { jobs: list.filter((m) => m.job !== job) });
    return OK;
  },

  async setGang(
    charId: number,
    gang: string,
    grade: number,
  ): Promise<PlayersResult> {
    const def = gangDefs.get(gang);
    if (!def) return changeError("UNKNOWN_GANG");
    if (!gradeOk(def.grades.length, grade)) return changeError("INVALID_GRADE");
    const data = await loadGangs(charId);
    let list = data.gangs;
    let active = data.active;
    const existing = list.find((m) => m.gang === gang);
    const only = !existing && !settings.gangs.multiGang;
    if (existing) existing.grade = grade;
    else {
      if (only) {
        list = [];
        active = null;
      } else if (list.length >= settings.gangs.maxGangs)
        return changeError("LIMIT");
      list.push({ gang, grade });
    }
    const activate = !active;
    await saveGangMembership(charId, gang, grade, only, activate);
    if (activate) active = gang;
    charWatchers.char(charId, { gangs: list, activeGang: active });
    return OK;
  },

  async removeGang(charId: number, gang: string): Promise<PlayersResult> {
    const data = await loadGangs(charId);
    if (!data.gangs.some((m) => m.gang === gang))
      return changeError("NOT_MEMBER");
    await deleteGang(charId, gang);
    const list = data.gangs.filter((m) => m.gang !== gang);
    let active = data.active;
    if (active === gang) {
      active = list[0]?.gang ?? null;
      await saveActiveGang(charId, active);
    }
    charWatchers.char(charId, { gangs: list, activeGang: active });
    return OK;
  },

  async setActiveGang(
    charId: number,
    gang: string | null,
  ): Promise<PlayersResult> {
    const data = await loadGangs(charId);
    if (gang !== null && !data.gangs.some((m) => m.gang === gang))
      return changeError("NOT_MEMBER");
    await saveActiveGang(charId, gang);
    charWatchers.char(charId, { activeGang: gang });
    return OK;
  },

  async meta(
    charId: number,
    key: string,
    value: unknown,
  ): Promise<PlayersResult> {
    const row = await findCharacter(charId);
    if (!row) return fail("ADMIN_PLAYERS_ERR_GONE");
    if (value === null) delete row.metadata[key];
    else row.metadata[key] = value;
    await updateMetadata(charId, row.metadata);
    charWatchers.meta(charId, key, value);
    return OK;
  },

  async position(charId: number, p: Position): Promise<PlayersResult> {
    await updatePosition(charId, p);
    charWatchers.char(charId, { position: p });
    return OK;
  },

  async info(
    charId: number,
    info: Pick<
      CharacterInfo,
      "firstname" | "lastname" | "birthdate" | "sex" | "nationality"
    >,
  ): Promise<PlayersResult> {
    await updateInfo(charId, info);
    charWatchers.char(charId, info);
    return OK;
  },
};
