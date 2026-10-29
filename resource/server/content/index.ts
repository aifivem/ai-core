import { AdminPanel, DataFile } from "@aicore-fivem/lib/server";
import type { AccountTypeDefinition, Branding, GangDefinition, GradeDefinition, JobDefinition } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { coreSchema } from "../admin/schema";
import { log } from "../log";
import { bool, ID_PATTERN, int, num, record, str, vec4, type Vec4 } from "./parse";

/** Panel content of ai-core (`data/*.json`), kept by the admin panel store and updated live on every panel edit. */

export interface Settings {
  branding: Branding;
  characters: { slots: number; canDelete: boolean; minAge: number };
  jobs: { multiJob: boolean; maxJobs: number; unemployed: string; restoreDuty: boolean };
  gangs: { multiGang: boolean; maxGangs: number };
  paycheck: { intervalMinutes: number; account: string; fromJobAccount: boolean };
  saveIntervalMinutes: number;
  spawn: { default: Vec4; select: { ped: Vec4; camera: Vec4; fov: number } };
}

export type AccountType = AccountTypeDefinition;
export type Grade = GradeDefinition;
export type JobDef = JobDefinition;
export type GangDef = GangDefinition;

function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const brand = record(s.branding);
  const chars = record(s.characters);
  const jobs = record(s.jobs);
  const gangs = record(s.gangs);
  const pay = record(s.paycheck);
  const spawn = record(s.spawn);
  const select = record(spawn.select);
  return {
    branding: {
      name: str(brand.name, "Los Santos", 32),
      subtitle: str(brand.subtitle, "Roleplay", 32),
      tagline: typeof brand.tagline === "string" ? brand.tagline.slice(0, 48) : "",
      taglineSub: typeof brand.taglineSub === "string" ? brand.taglineSub.slice(0, 64) : "",
      background: brand.background === "wet-drive" ? "wet-drive" : "skyline",
    },
    characters: { slots: int(chars.slots, 3, 1, 10), canDelete: bool(chars.canDelete, true), minAge: int(chars.minAge, 18, 0, 99) },
    jobs: {
      multiJob: bool(jobs.multiJob, true),
      maxJobs: int(jobs.maxJobs, 3, 1, 20),
      unemployed: str(jobs.unemployed, "unemployed", 32),
      restoreDuty: bool(jobs.restoreDuty, false),
    },
    gangs: { multiGang: bool(gangs.multiGang, true), maxGangs: int(gangs.maxGangs, 2, 1, 20) },
    paycheck: {
      intervalMinutes: int(pay.intervalMinutes, 15, 0, 1440),
      account: str(pay.account, "bank", 32),
      fromJobAccount: bool(pay.fromJobAccount, false),
    },
    saveIntervalMinutes: int(s.saveIntervalMinutes, 5, 1, 60),
    spawn: {
      default: vec4(spawn.default, { x: -1035.71, y: -2731.87, z: 13.76, heading: 330 }),
      select: {
        ped: vec4(select.ped, { x: -813.97, y: 176.22, z: 76.74, heading: -7.5 }),
        camera: vec4(select.camera, { x: -814.02, y: 179.56, z: 77.4, heading: 198.5 }),
        fov: num(select.fov, 40, 10, 120),
      },
    },
  };
}

function readGrades(raw: unknown): Grade[] {
  const list = Array.isArray(raw) ? raw : [];
  const grades = list.map((g) => {
    const v = record(g);
    return { label: str(v.label, "Member"), salary: int(v.salary, 0, 0), boss: bool(v.boss, false) };
  });
  return grades.length ? grades : [{ label: "Member", salary: 0, boss: false }];
}

/** Entries of a `{ id: {...} }` file whose id is valid. */
function entries<T>(raw: unknown, read: (value: Record<string, unknown>) => T): Map<string, T> {
  const out = new Map<string, T>();
  for (const [id, value] of Object.entries(record(raw))) {
    if (!ID_PATTERN.test(id)) {
      log.warn(`skipped invalid id "${id}" in panel content`);
      continue;
    }
    out.set(id, read(record(value)));
  }
  return out;
}

const readAccount = (v: Record<string, unknown>): AccountType => ({
  label: str(v.label, "Account"),
  start: int(v.start, 0),
  allowNegative: bool(v.allowNegative, false),
});

const readJob = (v: Record<string, unknown>): JobDef => ({
  label: str(v.label, "Job"),
  type: str(v.type, "none", 32),
  defaultDuty: bool(v.defaultDuty, false),
  grades: readGrades(v.grades),
});

const readGang = (v: Record<string, unknown>): GangDef => ({ label: str(v.label, "Gang"), grades: readGrades(v.grades) });

/** Keeps a map in step with a records file of the panel (a change puts or removes one entry). */
function follow<T>(file: string, target: Map<string, T>, read: (value: Record<string, unknown>) => T): void {
  panel.onChange(file, (key, value) => {
    if (key === undefined) return;
    if (value === null) target.delete(key);
    else if (ID_PATTERN.test(key)) target.set(key, read(record(value)));
  });
}

// The pay account select lists the account types that exist at start.
const startAccounts = Object.keys(record(new DataFile(ResourceName, "accounts", log).read()));

export const panel = new AdminPanel(coreSchema(startAccounts));

export const settings: Settings = readSettings(panel.get("settings"));
panel.onChange("settings", (_key, value) => Object.assign(settings, readSettings(value)));

export const accountTypes = entries(panel.get("accounts"), readAccount);
export const jobs = entries(panel.get("jobs"), readJob);
export const gangs = entries(panel.get("gangs"), readGang);
follow("accounts", accountTypes, readAccount);
follow("jobs", jobs, readJob);
follow("gangs", gangs, readGang);

if (!jobs.has(settings.jobs.unemployed)) {
  jobs.set(settings.jobs.unemployed, { label: "Civilian", type: "none", defaultDuty: true, grades: readGrades([]) });
}
if (accountTypes.size === 0) accountTypes.set("cash", { label: "Cash", start: 0, allowNegative: false });
