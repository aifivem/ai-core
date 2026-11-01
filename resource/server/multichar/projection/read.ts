import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  CharacterInfo,
  GangMembership,
  JobMembership,
} from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { settings } from "../../content";
import type { Player } from "../../player/player";

export type Vec4 = { x: number; y: number; z: number; heading: number };

/** What a projected row needs of a character, from memory (loaded or just unloaded) or from ai-core's tables. */
export interface CharacterState {
  info: CharacterInfo;
  money: Record<string, number>;
  job: JobMembership;
  onDuty: boolean;
  gang: GangMembership | null;
  metadata: Record<string, unknown>;
  position: Vec4 | null;
}

export interface Projected extends CharacterState {
  userId: number;
  license: string;
  playerName: string;
  lastPlayed: string | null;
}

/** A loaded character's state, read synchronously (also inside `playerUnloaded`, before the save). */
export function stateOf(player: Player): CharacterState {
  const active = player.gangs.activeGang();
  return {
    info: player.info(),
    money: player.wallet.snapshot(),
    job: player.jobs.current(),
    onDuty: player.jobs.onDuty() !== null,
    gang: active
      ? { gang: active, grade: player.gangs.grade(active) ?? 0 }
      : null,
    metadata: player.metadata(),
    position: player.spawnPosition(),
  };
}

interface CharRow {
  id: number;
  user_id: number;
  citizenid: string;
  slot: number;
  firstname: string;
  lastname: string;
  birthdate: string;
  sex: string;
  nationality: string;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  pos_h: number | null;
  metadata: string;
  last_played: string | null;
  license: string;
  name: string;
}

function parseMeta(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : {};
  } catch {
    // A broken bag projects empty; ai-core's next save writes a valid one.
    return {};
  }
}

/**
 * Every live character of these accounts (accounts without a license are skipped: both frameworks key on it). Stored
 * characters cost four indexed reads per batch; `live(charId)` answers from memory for loaded ones.
 */
export async function readCharacters(
  userIds: number[],
  live: (charId: number) => CharacterState | undefined,
): Promise<Projected[]> {
  if (userIds.length === 0) return [];
  const rows =
    (await mysql.query<CharRow[]>(
      `SELECT c.id, c.user_id, c.citizenid, c.slot, c.firstname, c.lastname, DATE_FORMAT(c.birthdate, '%Y-%m-%d') AS birthdate,
         c.sex, c.nationality, c.pos_x, c.pos_y, c.pos_z, c.pos_h, c.metadata,
         DATE_FORMAT(c.last_played, '%Y-%m-%d %H:%i:%s') AS last_played, u.license, u.name
       FROM ai_core_characters c JOIN ai_core_users u ON u.id = c.user_id
       WHERE c.user_id IN (?) AND c.deleted_at IS NULL AND u.license IS NOT NULL`,
      [userIds],
    )) ?? [];
  const stored = rows.filter((r) => !live(r.id)).map((r) => r.id);
  const [money, jobs, gangs] =
    stored.length === 0
      ? [[], [], []]
      : await Promise.all([
          mysql.query<
            Array<{ owner_id: string; name: string; balance: number }>
          >(
            "SELECT owner_id, name, balance FROM ai_core_accounts WHERE owner_type = 'character' AND owner_id IN (?)",
            [stored.map(String)],
          ),
          mysql.query<Array<{ char_id: number; job: string; grade: number }>>(
            "SELECT char_id, job, grade FROM ai_core_character_jobs WHERE char_id IN (?) ORDER BY char_id, job",
            [stored],
          ),
          mysql.query<
            Array<{ char_id: number; gang: string; grade: number }>
          >(
            "SELECT char_id, gang, grade FROM ai_core_character_gangs WHERE char_id IN (?) AND active = 1",
            [stored],
          ),
        ]);
  const moneyOf = new Map<number, Record<string, number>>();
  for (const m of money ?? []) {
    const id = Number(m.owner_id);
    const bag = moneyOf.get(id) ?? {};
    bag[m.name] = Number(m.balance);
    moneyOf.set(id, bag);
  }
  const jobsOf = new Map<number, JobMembership[]>();
  for (const j of jobs ?? [])
    jobsOf.set(j.char_id, [
      ...(jobsOf.get(j.char_id) ?? []),
      { job: j.job, grade: j.grade },
    ]);
  const gangOf = new Map(
    (gangs ?? []).map((g) => [g.char_id, { gang: g.gang, grade: g.grade }]),
  );
  return rows.map((r) => {
    const base = {
      userId: r.user_id,
      license: r.license,
      playerName: r.name,
      lastPlayed: r.last_played,
    };
    const state = live(r.id);
    if (state) return { ...state, ...base };
    const metadata = parseMeta(r.metadata);
    const list = jobsOf.get(r.id) ?? [];
    // ai-core's current job of a stored character: the last duty job, else the first (`JobSet.current`).
    const job = list.find((m) => m.job === metadata.lastDutyJob) ??
      list[0] ?? { job: settings.jobs.unemployed, grade: 0 };
    const position =
      r.pos_x !== null && r.pos_y !== null && r.pos_z !== null
        ? { x: r.pos_x, y: r.pos_y, z: r.pos_z, heading: r.pos_h ?? 0 }
        : null;
    return {
      ...base,
      info: {
        id: r.id,
        citizenid: r.citizenid,
        slot: r.slot,
        firstname: r.firstname,
        lastname: r.lastname,
        birthdate: r.birthdate,
        sex: r.sex === "female" ? "female" : "male",
        nationality: r.nationality,
      },
      money: moneyOf.get(r.id) ?? {},
      job,
      onDuty: false,
      gang: gangOf.get(r.id) ?? null,
      metadata,
      position,
    };
  });
}
