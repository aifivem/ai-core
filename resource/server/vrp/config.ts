import { isRecord } from "@aicore-fivem/lib/shared";
import {
  VRP,
  type VrpConfig,
  type VrpGroupAlias,
  type VrpPermissionRule,
} from "@aicore-fivem/shared";
import { gangs, jobs, panel } from "../content";
import { log } from "../log";
import { VRP_DEFAULTS } from "./schema";

/**
 * The panel's vRP mapping (`data/vrp.json`) for the Lua bridge: parsed once per change, handed out by the
 * `GetVrpConfig` export and sent with `VRP.configEvent` when an admin changes it. `seen` (permission strings scripts
 * asked for) is kept here and written to the file in batches.
 */

const text = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";
const flag = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;
const grade = (v: unknown): number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 30 ? v : 0;
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isRecord) : [];

/** The panel's "who" choice of a row (absent in hand-written rows: every filled target counts). */
const WHO = ["job", "gang", "group", "admin", "everyone"] as const;
type Who = (typeof WHO)[number];
const whoOf = (v: unknown): Who | null => WHO.find((w) => w === v) ?? null;

function readRule(row: Record<string, unknown>): VrpPermissionRule | null {
  const permission = text(row.permission, 100).trim();
  if (!permission) return null;
  const rule: VrpPermissionRule = {
    permission,
    job: text(row.job, 32),
    gang: text(row.gang, 32),
    group: text(row.group, 64),
    grade: grade(row.grade),
    onDuty: flag(row.onDuty, true),
    admin: flag(row.admin, false),
    everyone: flag(row.everyone, false),
  };
  const who = whoOf(row.who);
  if (!who) return rule;
  return {
    ...rule,
    job: who === "job" ? rule.job : "",
    gang: who === "gang" ? rule.gang : "",
    group: who === "group" ? rule.group : "",
    admin: who === "admin",
    everyone: who === "everyone",
  };
}

function readAlias(row: Record<string, unknown>): VrpGroupAlias {
  const alias: VrpGroupAlias = {
    job: text(row.job, 32),
    gang: text(row.gang, 32),
    grade: grade(row.grade),
    admin: flag(row.admin, false),
  };
  const who = whoOf(row.who);
  if (!who) return alias;
  return {
    ...alias,
    job: who === "job" ? alias.job : "",
    gang: who === "gang" ? alias.gang : "",
    admin: who === "admin",
  };
}

export function readVrpConfig(raw: unknown): VrpConfig {
  const file = isRecord(raw) ? raw : {};
  const d = isRecord(file.defaults) ? file.defaults : {};
  const fallback = VRP_DEFAULTS.defaults;
  const groups: Record<string, VrpGroupAlias> = {};
  for (const row of rows(file.groups)) {
    const group = text(row.group, 64).trim();
    if (group) groups[group] = readAlias(row);
  }
  const items: Record<string, string> = {};
  for (const row of rows(file.items)) {
    const vrp = text(row.vrp, 100).trim();
    const item = text(row.item, 64).trim();
    if (vrp && item) items[vrp] = item;
  }
  return {
    defaults: {
      jobPrefix: flag(d.jobPrefix, fallback.jobPrefix),
      jobOnDuty: flag(d.jobOnDuty, fallback.jobOnDuty),
      adminPrefix: flag(d.adminPrefix, fallback.adminPrefix),
      playerPrefix: flag(d.playerPrefix, fallback.playerPrefix),
    },
    permissions: rows(file.permissions)
      .map(readRule)
      .filter((rule): rule is VrpPermissionRule => rule !== null),
    groups,
    items,
  };
}

const view = panel.view("vrp", readVrpConfig);

/** The current mapping (parsed once per change; the export call copies it into Lua). */
export function vrpConfig(): VrpConfig {
  return view.value;
}

// Only a change of the mapping reaches the bridge (a `seen` batch rewrites the file too).
let sent = JSON.stringify(view.value);
panel.onChange("vrp", () => {
  const next = JSON.stringify(view.value);
  if (next === sent) return;
  sent = next;
  emit(VRP.configEvent, view.value);
});

/**
 * A new or edited rule / group row must name a grade its job or gang has (rows already stored are not checked again,
 * so deleting a job never blocks other edits).
 */
function gradeError(next: unknown, before: unknown): string | null {
  const stored = new Set(rows(before).map((row) => JSON.stringify(row)));
  for (const row of rows(next)) {
    if (stored.has(JSON.stringify(row))) continue;
    const who = whoOf(row.who) ?? (row.job ? "job" : row.gang ? "gang" : null);
    const def =
      who === "job"
        ? jobs.get(text(row.job, 32))
        : who === "gang"
          ? gangs.get(text(row.gang, 32))
          : undefined;
    if (def && grade(row.grade) >= def.grades.length)
      return "ADMIN_ERR_VRP_GRADE";
  }
  return null;
}

panel.rule("vrp", (_key, next) => {
  const before = panel.get<Record<string, unknown>>("vrp");
  return (
    gradeError(next.permissions, before.permissions) ??
    gradeError(next.groups, before.groups)
  );
});

const MAX_SEEN = 5000;
const SEEN_DELAY_MS = 10_000;

/** Permission strings scripts asked for; new ones are written to the file at most every 10 s. */
class SeenPermissions {
  private readonly names: Set<string>;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private full = false;

  constructor() {
    const stored = panel.get<Record<string, unknown>>("vrp").seen;
    this.names = new Set(
      Array.isArray(stored)
        ? stored.filter((s): s is string => typeof s === "string")
        : [],
    );
  }

  add(permission: unknown): boolean {
    if (
      typeof permission !== "string" ||
      permission === "" ||
      permission.length > 100 ||
      this.names.has(permission)
    )
      return false;
    if (this.names.size >= MAX_SEEN) {
      if (!this.full)
        log.warn(`vRP: ${MAX_SEEN} permission strings recorded, no more kept`);
      this.full = true;
      return false;
    }
    this.names.add(permission);
    this.timer ??= setTimeout(() => this.write(), SEEN_DELAY_MS);
    return true;
  }

  private write(): void {
    this.timer = null;
    panel.commit("vrp", undefined, {
      ...panel.get<Record<string, unknown>>("vrp"),
      seen: [...this.names].sort(),
    });
  }
}

export const seenPermissions = new SeenPermissions();
