import { createLogger } from "@aicore-fivem/lib/shared";
import { APPEARANCE_SYSTEMS } from "../appearance/registry";
import { DISPATCH_SYSTEMS } from "../dispatch/registry";
import { INVENTORIES } from "../inventory/registry";
import { MEDICAL_SYSTEMS } from "../medical";
import { PRISONS } from "../prison";
import { KEY_SYSTEMS } from "../vehicleKeys/registry";
import { WEATHER_SYSTEMS } from "../world";
import { FUEL_SYSTEMS } from "../fuel/registry";
import { DOORLOCK_SYSTEMS } from "../doorlock/registry";
import { GARAGE_SYSTEMS } from "../garages/registry";

/**
 * Integration layers whose third-party scripts make the ai-* default unneeded (owner decision): any of them running
 * next to `ours` is reported. An adapter marked `besideOurs` runs next to it on purpose (an MDT, a police job's jail).
 */
const LAYERS: Array<{
  ours: string;
  adapters: readonly { resource: string; besideOurs?: boolean }[];
}> = [
  { ours: "ai-inventory", adapters: INVENTORIES },
  { ours: "ai-appearance", adapters: APPEARANCE_SYSTEMS },
  { ours: "ai-vehiclekeys", adapters: KEY_SYSTEMS },
  { ours: "ai-policealert", adapters: DISPATCH_SYSTEMS },
  { ours: "ai-death", adapters: MEDICAL_SYSTEMS },
  { ours: "ai-prison", adapters: PRISONS },
  { ours: "ai-weathersync", adapters: WEATHER_SYSTEMS },
  { ours: "ai-fuel", adapters: FUEL_SYSTEMS },
  { ours: "ai-doorlock", adapters: DOORLOCK_SYSTEMS },
  { ours: "ai-garages", adapters: GARAGE_SYSTEMS },
];

const log = createLogger("ai-core");

/** One script that makes others unneeded (`keep` runs, `remove` should go). */
export interface Replacement {
  keep: string;
  remove: string[];
  /** Who declared it: ai-core, a resource's fxmanifest (`ai_replaces`) or a resource through the export. */
  from: string;
}

/** A found clash: `remove` is installed next to `keep`; `running` = both are started (players are refused). */
export interface Conflict {
  keep: string;
  remove: string;
  running: boolean;
  from: string;
}

/** ai-* scripts that stand in for a third-party name: both can never run (one `provide`s the other's name). */
const STAND_INS: Record<string, string[]> = {
  "ai-appearance": ["tgiann-clothing"],
  "ai-banking": ["qb-banking", "Renewed-Banking"],
  "ai-chat": ["chat"],
  "ai-inventory": ["ox_inventory", "qb-inventory"],
  "ai-policealert": ["tgiann-policealert"],
  "ai-radialmenu": ["qb-radialmenu", "tgiann-radialmenu-target"],
  "ai-target": ["ox_target"],
  "ai-vehiclekeys": ["qbx_vehiclekeys"],
  "ai-vehicles": ["qbx_vehicles"],
  "ai-voice": ["pma-voice"],
  "ai-weathersync": ["qb-weathersync"],
};
/**
 * Client-side layers (radial menus, HUDs): their adapter lists live in the client bundle, so the scripts that make the
 * ai-* default unneeded are named here (keep in step with `client/radial/` and `client/hud.ts`).
 */
const CLIENT_LAYERS: Record<string, string[]> = {
  "ai-radialmenu": ["tgiann-radialmenu", "codem-supreme-radialmenu"],
  "ai-hud": [
    "tgiann-lumihud",
    "tgiann-hudv2",
    "tgiann-modern-hud",
    "tgiann-statushud",
    "jg-hud",
    "0r-hud-v3",
    "codem-supreme-hud",
    "Codem-BlackHUDV2",
    "wais-hudv6",
    "qb-hud",
    "ps-hud",
  ],
};
/** Third-party names ai-core and ai-mysql stand in for: the third-party copy is the one to delete. */
const NEVER_NEXT_TO: Record<string, string[]> = {
  "ai-core": [
    "es_extended",
    "qb-core",
    "qbx_core",
    "esx_context",
    "esx_textui",
    "esx_notify",
    "esx_progressbar",
    "esx_menu_default",
    "esx_menu_dialog",
    "esx_menu_list",
    "qb-menu",
    "qb-input",
    "progressbar",
    // vRP (ai-core provides vrp) and vRP's DB drivers, which only call vRP.registerDBDriver.
    "vrp",
    "vRP",
    "vrp_mysql",
    "vrp_oxmysql",
    "vrp_ghmattimysql",
    "vRP-db-drivers",
  ],
  "ai-mysql": ["oxmysql", "mysql-async", "ghmattimysql"],
};

/**
 * Built-in rules: stand-ins, and every inventory / clothing / key system adapter making ai-inventory / ai-appearance /
 * ai-vehiclekeys unneeded.
 */
function builtIn(): Replacement[] {
  const out: Replacement[] = [];
  for (const [ours, names] of Object.entries(STAND_INS))
    for (const name of names)
      out.push({ keep: name, remove: [ours], from: "ai-core" });
  for (const [ours, names] of Object.entries(NEVER_NEXT_TO))
    out.push({ keep: ours, remove: names, from: "ai-core" });
  for (const [ours, names] of Object.entries(CLIENT_LAYERS))
    for (const name of names)
      out.push({ keep: name, remove: [ours], from: "ai-core" });
  for (const { ours, adapters } of LAYERS)
    for (const a of adapters)
      if (a.resource !== ours && !a.besideOurs)
        out.push({ keep: a.resource, remove: [ours], from: "ai-core" });
  return out;
}

/** Real resources on the server (a `provide`d name is not one) with their state. */
function installed(): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < GetNumResources(); i++) {
    const name = GetResourceByFindIndex(i);
    if (name) out.set(name, GetResourceState(name));
  }
  return out;
}

/** `ai_replaces 'ai-inventory'` lines in a resource's fxmanifest. */
function manifestRules(resources: Iterable<string>): Replacement[] {
  const out: Replacement[] = [];
  for (const resource of resources) {
    const count = GetNumResourceMetadata(resource, "ai_replaces");
    const remove: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = GetResourceMetadata(resource, "ai_replaces", i);
      if (name) remove.push(name);
    }
    if (remove.length > 0)
      out.push({ keep: resource, remove, from: `${resource} fxmanifest` });
  }
  return out;
}

/**
 * Finds scripts that are not needed next to others (tgiann-inventory makes ai-inventory unneeded): logged on the console
 * with the folder to delete, and while both run, players are refused at connecting (`index.ts`).
 */
class Conflicts {
  private readonly declared = new Map<string, Replacement>();
  private current: Conflict[] = [];
  private reported = new Set<string>();
  private pending: ReturnType<typeof setTimeout> | null = null;

  /** Checks again after `delay` ms (resource starts come in bursts). */
  schedule(delay: number): void {
    if (this.pending) clearTimeout(this.pending);
    this.pending = setTimeout(() => {
      this.pending = null;
      this.check();
    }, delay);
  }

  /** A resource declares through the export that it makes `remove` unneeded; dropped when it stops. */
  declare(keep: string, remove: string[], from: string): void {
    this.declared.set(`${from}>${keep}`, { keep, remove, from });
    this.check();
  }

  dropFrom(resource: string): void {
    for (const [key, rule] of this.declared)
      if (rule.from === resource) this.declared.delete(key);
  }

  /** The clashes right now. */
  list(): readonly Conflict[] {
    return this.current;
  }

  /** Whether players are refused: a clash with both scripts started. */
  blocking(): Conflict[] {
    return this.current.filter((c) => c.running);
  }

  check(): void {
    const resources = installed();
    const rules = [
      ...builtIn(),
      ...manifestRules(resources.keys()),
      ...this.declared.values(),
    ];
    const found = new Map<string, Conflict>();
    for (const rule of rules) {
      if (resources.get(rule.keep) !== "started") continue;
      for (const remove of rule.remove) {
        const state = resources.get(remove);
        if (state === undefined || state === "missing" || remove === rule.keep)
          continue;
        found.set(`${rule.keep}>${remove}`, {
          keep: rule.keep,
          remove,
          running: state === "started" || state === "starting",
          from: rule.from,
        });
      }
    }
    this.current = [...found.values()];
    const now = new Set<string>();
    for (const c of this.current) {
      const key = `${c.keep}>${c.remove}:${c.running}`;
      now.add(key);
      if (this.reported.has(key)) continue;
      const path = GetResourcePath(c.remove).replace(/\/+/g, "/");
      if (c.running)
        log.error(
          `${c.keep} runs and makes ${c.remove} unneeded, but both are started: players are refused until ${c.remove} is removed. Delete ${path} and its ensure line, then restart. (rule: ${c.from})`,
        );
      else
        log.warn(
          `${c.keep} makes ${c.remove} unneeded: delete ${path} and its ensure line. (rule: ${c.from})`,
        );
    }
    this.reported = now;
  }
}

export const conflicts = new Conflicts();
