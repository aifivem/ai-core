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

/** One script that makes others unneeded (`keep` runs, `remove` should go). */
export interface Replacement {
  keep: string;
  remove: string[];
  /** Who declared it: ai-core, a resource's fxmanifest (`ai_replaces`) or a resource through the export. */
  from: string;
}

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
export function builtIn(): Replacement[] {
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
