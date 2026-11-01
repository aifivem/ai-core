import type {
  AccountTypeDefinition,
  GangDefinition,
  GradeDefinition,
  JobDefinition,
} from "@aicore-fivem/shared";
import { bool, int, record, str } from "./parse";
import { readJobPrime, type PrimeHours } from "./primeTime";

/** Record shapes of the panel's `accounts`, `jobs` and `gangs` files and their parsers. */

export type AccountType = AccountTypeDefinition;
/** `offPrimePayment`: paid outside prime time instead of salary x the off prime multiplier (0 = not set). */
export interface Grade extends GradeDefinition {
  offPrimePayment: number;
}
/** `prime`: the job's own prime hours, null = the default hours. */
export interface JobDef extends JobDefinition {
  /** Listed in job centers: anyone may take it (ESX `whitelisted` = not listed). */
  listed: boolean;
  grades: Grade[];
  prime: PrimeHours | null;
}
export type GangDef = GangDefinition;

export function readGrades(raw: unknown): Grade[] {
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

export const readAccount = (v: Record<string, unknown>): AccountType => ({
  label: str(v.label, "Account"),
  start: int(v.start, 0),
  allowNegative: bool(v.allowNegative, false),
});

export const readJob = (v: Record<string, unknown>): JobDef => ({
  label: str(v.label, "Job"),
  type: str(v.type, "none", 32),
  defaultDuty: bool(v.defaultDuty, false),
  listed: bool(v.listed, false),
  grades: readGrades(v.grades),
  prime: readJobPrime(v),
});

export const readGang = (v: Record<string, unknown>): GangDef => ({
  label: str(v.label, "Gang"),
  grades: readGrades(v.grades),
});
