import { AdminPanel, DataFile } from "@aicore-fivem/lib/server";
import type {
  AccountTypeDefinition,
  Branding,
  CharacterScene,
  GangDefinition,
  GradeDefinition,
  JobDefinition,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { coreSchema } from "../admin/schema";
import { INVENTORIES } from "../inventory/registry";
import { KEY_SYSTEMS } from "../vehicleKeys/registry";
import { DISPATCH_SYSTEMS } from "../dispatch/registry";
import { log } from "../log";
import { bool, ID_PATTERN, int, record, str, vec4, type Vec4 } from "./parse";
import { readScene } from "./scene";
import {
  readJobPrime,
  readPrimeTime,
  type PrimeHours,
  type PrimeTimeSettings,
} from "./primeTime";

/** Panel content of ai-core (`data/*.json`), kept by the admin panel store and updated live on every panel edit. */

export interface Settings {
  branding: Branding;
  characters: { slots: number; canDelete: boolean; minAge: number };
  jobs: {
    multiJob: boolean;
    maxJobs: number;
    unemployed: string;
    restoreDuty: boolean;
  };
  gangs: { multiGang: boolean; maxGangs: number };
  paycheck: {
    intervalMinutes: number;
    account: string;
    fromJobAccount: boolean;
  };
  primeTime: PrimeTimeSettings;
  saveIntervalMinutes: number;
  /** `auto` or the resource name of the inventory ai-core's inventory layer uses. */
  inventory: string;
  /** `auto` or the resource name of the key system ai-core's vehicle key layer uses. */
  vehicleKeys: string;
  /** `auto` or the resource name of the alert system ai-core's dispatch layer uses. */
  dispatch: string;
  /** How players use points of every script: the right-side prompt and its key, or the target eye (needs a target resource). */
  interaction: "prompt" | "target";
  /** Refuse connecting players while an unneeded script runs next to the one that replaces it. */
  refuseOnConflict: boolean;
  /** GitHub release check of every script with a `repository` line; `ignore` = resources never checked. */
  updates: { check: boolean; ignore: string[] };
  /** The admin finished the setup guide; until then every player sees how to start it after spawning. */
  setupDone: boolean;
  spawn: { default: Vec4 };
  characterScene: CharacterScene;
}

export type AccountType = AccountTypeDefinition;
/** `offPrimePayment`: paid outside prime time instead of salary x the off prime multiplier (0 = not set). */
export interface Grade extends GradeDefinition {
  offPrimePayment: number;
}
/** `prime`: the job's own prime hours, null = the default hours. */
export interface JobDef extends JobDefinition {
  grades: Grade[];
  prime: PrimeHours | null;
}
export type GangDef = GangDefinition;

function readUpdates(u: Record<string, unknown>): Settings["updates"] {
  const ignore = Array.isArray(u.ignore) ? u.ignore : [];
  return {
    check: bool(u.check, true),
    ignore: ignore.filter((r): r is string => typeof r === "string"),
  };
}

function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const brand = record(s.branding);
  const chars = record(s.characters);
  const jobs = record(s.jobs);
  const gangs = record(s.gangs);
  const pay = record(s.paycheck);
  const spawn = record(s.spawn);
  return {
    branding: {
      name: str(brand.name, "Los Santos", 32),
      subtitle: str(brand.subtitle, "Roleplay", 32),
      tagline:
        typeof brand.tagline === "string" ? brand.tagline.slice(0, 48) : "",
      taglineSub:
        typeof brand.taglineSub === "string"
          ? brand.taglineSub.slice(0, 64)
          : "",
      background: brand.background === "wet-drive" ? "wet-drive" : "skyline",
    },
    characters: {
      slots: int(chars.slots, 3, 1, 10),
      canDelete: bool(chars.canDelete, true),
      minAge: int(chars.minAge, 18, 0, 99),
    },
    jobs: {
      multiJob: bool(jobs.multiJob, true),
      maxJobs: int(jobs.maxJobs, 3, 1, 20),
      unemployed: str(jobs.unemployed, "unemployed", 32),
      restoreDuty: bool(jobs.restoreDuty, false),
    },
    gangs: {
      multiGang: bool(gangs.multiGang, true),
      maxGangs: int(gangs.maxGangs, 2, 1, 20),
    },
    paycheck: {
      intervalMinutes: int(pay.intervalMinutes, 15, 0, 1440),
      account: str(pay.account, "bank", 32),
      fromJobAccount: bool(pay.fromJobAccount, false),
    },
    primeTime: readPrimeTime(s.primeTime),
    saveIntervalMinutes: int(s.saveIntervalMinutes, 5, 1, 60),
    inventory: str(s.inventory, "auto", 32),
    vehicleKeys: str(s.vehicleKeys, "auto", 32),
    dispatch: str(s.dispatch, "auto", 32),
    interaction: s.interaction === "target" ? "target" : "prompt",
    refuseOnConflict: bool(s.refuseOnConflict, true),
    updates: readUpdates(record(s.updates)),
    setupDone: bool(s.setupDone, false),
    spawn: {
      default: vec4(spawn.default, {
        x: -1035.71,
        y: -2731.87,
        z: 13.76,
        heading: 330,
      }),
    },
    characterScene: readScene(s.characterScene),
  };
}

function readGrades(raw: unknown): Grade[] {
  const list = Array.isArray(raw) ? raw : [];
  const grades = list.map((g) => {
    const v = record(g);
    return {
      label: str(v.label, "Member"),
      salary: int(v.salary, 0, 0),
      boss: bool(v.boss, false),
      offPrimePayment: int(v.offPrimePayment, 0, 0),
    };
  });
  return grades.length
    ? grades
    : [{ label: "Member", salary: 0, boss: false, offPrimePayment: 0 }];
}

/** Entries of a `{ id: {...} }` file whose id is valid. */
function entries<T>(
  raw: unknown,
  read: (value: Record<string, unknown>) => T,
): Map<string, T> {
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
  prime: readJobPrime(v),
});

const readGang = (v: Record<string, unknown>): GangDef => ({
  label: str(v.label, "Gang"),
  grades: readGrades(v.grades),
});

/** Keeps a map in step with a records file of the panel (a change puts or removes one entry). */
function follow<T>(
  file: string,
  target: Map<string, T>,
  read: (value: Record<string, unknown>) => T,
): void {
  panel.onChange(file, (key, value) => {
    if (key === undefined) return;
    if (value === null) target.delete(key);
    else if (ID_PATTERN.test(key)) target.set(key, read(record(value)));
  });
}

// The pay account select lists the account types that exist at start.
const startAccounts = Object.keys(
  record(new DataFile(ResourceName, "accounts", log).read()),
);

export const panel = new AdminPanel(
  coreSchema(
    startAccounts,
    INVENTORIES.map((adapter) => adapter.resource),
    KEY_SYSTEMS.map((adapter) => adapter.resource),
    DISPATCH_SYSTEMS.map((adapter) => adapter.resource),
  ),
);

export const settings: Settings = readSettings(panel.get("settings"));
panel.onChange("settings", (_key, value) =>
  Object.assign(settings, readSettings(value)),
);

export const accountTypes = entries(panel.get("accounts"), readAccount);
export const jobs = entries(panel.get("jobs"), readJob);
export const gangs = entries(panel.get("gangs"), readGang);
follow("accounts", accountTypes, readAccount);
follow("jobs", jobs, readJob);
follow("gangs", gangs, readGang);

if (!jobs.has(settings.jobs.unemployed)) {
  jobs.set(settings.jobs.unemployed, {
    label: "Civilian",
    type: "none",
    defaultDuty: true,
    grades: readGrades([]),
    prime: null,
  });
}
if (accountTypes.size === 0)
  accountTypes.set("cash", { label: "Cash", start: 0, allowNegative: false });
