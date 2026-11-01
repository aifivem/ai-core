import type { GangMembership, JobMembership } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { db } from "../db";

/** SQL of job and gang memberships. Writes are single-row upserts/deletes queued by the owner. */

export async function loadJobs(charId: number): Promise<JobMembership[]> {
  const rows = await db.select("ai_core_character_jobs", ["job", "grade"], {
    char_id: charId,
  });
  return rows.map((row) => ({ job: row.job, grade: row.grade }));
}

export async function loadGangs(
  charId: number,
): Promise<{ gangs: GangMembership[]; active: string | null }> {
  const list = await db.select(
    "ai_core_character_gangs",
    ["gang", "grade", "active"],
    { char_id: charId },
  );
  return {
    gangs: list.map((row) => ({ gang: row.gang, grade: row.grade })),
    active: list.find((row) => row.active)?.gang ?? null,
  };
}

export function saveJob(
  charId: number,
  job: string,
  grade: number,
): Promise<unknown> {
  return mysql.query(
    "INSERT INTO ai_core_character_jobs (char_id, job, grade) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade)",
    [charId, job, grade],
  );
}

export function deleteJob(charId: number, job: string): Promise<unknown> {
  return db.remove("ai_core_character_jobs", { char_id: charId, job });
}

export function saveGang(
  charId: number,
  gang: string,
  grade: number,
): Promise<unknown> {
  return mysql.query(
    "INSERT INTO ai_core_character_gangs (char_id, gang, grade) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade)",
    [charId, gang, grade],
  );
}

export function deleteGang(charId: number, gang: string): Promise<unknown> {
  return db.remove("ai_core_character_gangs", { char_id: charId, gang });
}

/** Marks one gang active (or none) for a character in one statement. */
export function saveActiveGang(
  charId: number,
  gang: string | null,
): Promise<unknown> {
  return mysql.query(
    "UPDATE ai_core_character_gangs SET active = (gang = ?) WHERE char_id = ?",
    [gang ?? "", charId],
  );
}

/**
 * A character's only job (multi-job off) in one transaction: the other memberships go with the same commit, so a
 * failure leaves the old ones (stored characters; a loaded one changes through its `JobSet`).
 */
export async function saveOnlyJob(
  charId: number,
  job: string,
  grade: number,
): Promise<void> {
  const committed = await mysql.transaction([
    {
      query:
        "DELETE FROM ai_core_character_jobs WHERE char_id = ? AND job <> ?",
      values: [charId, job],
    },
    {
      query:
        "INSERT INTO ai_core_character_jobs (char_id, job, grade) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade)",
      values: [charId, job, grade],
    },
  ]);
  if (!committed) throw new Error(`job ${job} of #${charId} rolled back`);
}

/**
 * A stored character's gang membership in one transaction: `only` drops the other gangs (multi-gang off), `activate`
 * makes it the active gang (the character had none).
 */
export async function saveGangMembership(
  charId: number,
  gang: string,
  grade: number,
  only: boolean,
  activate: boolean,
): Promise<void> {
  const committed = await mysql.transaction([
    ...(only
      ? [
          {
            query:
              "DELETE FROM ai_core_character_gangs WHERE char_id = ? AND gang <> ?",
            values: [charId, gang],
          },
        ]
      : []),
    {
      query:
        "INSERT INTO ai_core_character_gangs (char_id, gang, grade) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade)",
      values: [charId, gang, grade],
    },
    ...(activate
      ? [
          {
            query:
              "UPDATE ai_core_character_gangs SET active = (gang = ?) WHERE char_id = ?",
            values: [gang, charId],
          },
        ]
      : []),
  ]);
  if (!committed) throw new Error(`gang ${gang} of #${charId} rolled back`);
}
