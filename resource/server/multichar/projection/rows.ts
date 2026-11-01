import { gangs as gangDefs, jobs as jobDefs, settings } from "../../content";
import type { Projected, Vec4 } from "./read";

/** Row values of the framework tables, in each table's insert column order. */

/** The job as QB writes it into `players.job` (`BridgeShapes.qbJob`); an unknown job shows as unemployed. */
function qbJob(c: Projected): Record<string, unknown> {
  const known = jobDefs.has(c.job.job);
  const name = known ? c.job.job : settings.jobs.unemployed;
  const def = jobDefs.get(name);
  const level = known ? c.job.grade : 0;
  const grade = def?.grades[level] ?? def?.grades[0];
  return {
    name,
    label: def?.label ?? name,
    type: def?.type ?? "none",
    payment: grade?.salary ?? 0,
    onduty: c.onDuty,
    isboss: grade?.boss ?? false,
    grade: { name: grade?.label ?? "", level },
  };
}

function qbGang(c: Projected): Record<string, unknown> {
  const def = c.gang ? gangDefs.get(c.gang.gang) : undefined;
  if (!c.gang || !def)
    return {
      name: "none",
      label: "No Gang Affiliation",
      isboss: false,
      grade: { name: "none", level: 0 },
    };
  const grade = def.grades[c.gang.grade] ?? def.grades[0];
  return {
    name: c.gang.gang,
    label: def.label,
    isboss: grade?.boss ?? false,
    grade: { name: grade?.label ?? "", level: c.gang.grade },
  };
}

const where = (c: Projected): Vec4 => c.position ?? settings.spawn.default;

/** `players` columns in insert order (QB / Qbox). */
export const QB_COLUMNS =
  "id, citizenid, user_id, cid, license, name, money, charinfo, job, gang, position, metadata, inventory";

export function qbRow(c: Projected): unknown[] {
  const { info } = c;
  return [
    info.id,
    info.citizenid,
    c.userId,
    info.slot,
    `license:${c.license}`,
    c.playerName,
    JSON.stringify(c.money),
    JSON.stringify({
      firstname: info.firstname,
      lastname: info.lastname,
      birthdate: info.birthdate,
      gender: info.sex === "female" ? 1 : 0,
      nationality: info.nationality,
      cid: info.slot,
    }),
    JSON.stringify(qbJob(c)),
    JSON.stringify(qbGang(c)),
    JSON.stringify(where(c)),
    JSON.stringify(c.metadata),
    null,
  ];
}

/** `users` columns in insert order (ESX). */
export const ESX_COLUMNS =
  "identifier, id, user_id, accounts, `group`, inventory, job, job_grade, loadout, metadata, position, firstname, lastname, dateofbirth, sex, height, skin, disabled, last_seen";

/** ESX account names: ai-core's `cash` is ESX `money`, the others keep their names. */
function esxAccounts(money: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { money: 0, bank: 0, black_money: 0 };
  for (const [name, balance] of Object.entries(money))
    out[name === "cash" ? "money" : name] = balance;
  return out;
}

export function esxRow(c: Projected): unknown[] {
  const { info } = c;
  const known = jobDefs.has(c.job.job);
  const height = c.metadata.height;
  return [
    `char${info.slot}:${c.license}`,
    info.id,
    c.userId,
    JSON.stringify(esxAccounts(c.money)),
    "user",
    null,
    known ? c.job.job : settings.jobs.unemployed,
    known ? c.job.grade : 0,
    null,
    JSON.stringify(c.metadata),
    JSON.stringify(where(c)),
    info.firstname,
    info.lastname,
    info.birthdate,
    info.sex === "female" ? "f" : "m",
    typeof height === "number" && Number.isFinite(height)
      ? Math.round(height)
      : 0,
    null,
    0,
    c.lastPlayed,
  ];
}

/** `jobs` and `job_grades` rows of panel jobs (ESX `grade_name` as the bridge writes it). */
export function jobRows(names: Iterable<string>): {
  jobs: unknown[][];
  grades: unknown[][];
} {
  const jobs: unknown[][] = [];
  const grades: unknown[][] = [];
  for (const name of names) {
    const def = jobDefs.get(name);
    if (!def) continue;
    jobs.push([name, def.label.slice(0, 50), def.listed ? 0 : 1]);
    def.grades.forEach((g, level) =>
      grades.push([
        name,
        level,
        g.label.toLowerCase().replace(/\s+/g, "_").slice(0, 50),
        g.label.slice(0, 50),
        g.salary,
        "{}",
        "{}",
      ]),
    );
  }
  return { jobs, grades };
}
