import type { Branding, CharacterScene } from "@aicore-fivem/shared";
import { readVec4 } from "@aicore-fivem/lib/shared";
import { bool, int, record, str, vec4, type Vec4 } from "./parse";
import { readScene } from "./scene";
import { readPrimeTime, type PrimeTimeSettings } from "./primeTime";

/** ai-core's settings file (`data/settings.json`) and its parser. */

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
  /** `auto` or the resource name of the clothing script ai-core's appearance layer uses. */
  appearance: string;
  /** `auto` or the resource name of the billing script ("ai-core" = its own bills) of ai-core's billing layer. */
  billing: string;
  /** `auto` or the resource name of the banking script ai-core's banking layer uses. */
  banking: string;
  /** `core`: the banking script works on ai-core's job and gang accounts; `own`: it keeps its own and ai-core leaves them alone. */
  bankAccounts: "core" | "own";
  /** `auto` or the resource name of the MDT ai-core's MDT layer uses. */
  mdt: string;
  /** `auto` or the resource name of the EMS source ("ai-core" = its own duty counts) of ai-core's EMS layer. */
  ems: string;
  /** `auto` or the resource name of the fuel script ai-core's fuel layer uses. */
  fuel: string;
  /** `auto` or the resource name of the door lock script ai-core's door lock layer uses. */
  doorlock: string;
  /** `auto` or the resource name of the garage script ai-core's garage layer uses. */
  garages: string;
  /** Where ai-lib's notification cards go: `ai-lib` (its own) or another notification UI's resource name. */
  notify: string;
  /** How players use points of every script: the right-side prompt and its key, or the target eye (needs a target resource). */
  interaction: "prompt" | "target";
  /** Players can hurt each other (QB `PVP`). */
  pvp: boolean;
  /** Refuse connecting players while an unneeded script runs next to the one that replaces it. */
  refuseOnConflict: boolean;
  /** GitHub release check of every script with a `repository` line; `ignore` = resources never checked. */
  updates: { check: boolean; ignore: string[] };
  /** The admin finished the setup guide; until then every player sees how to start it after spawning. */
  setupDone: boolean;
  /** `choose`: after picking a character the player picks the last location or one of `points`. */
  spawn: {
    default: Vec4;
    choose: boolean;
    points: Array<{ label: string; coords: Vec4 }>;
  };
  characterScene: CharacterScene;
  /** `auto` (an external multichar while one runs), `ai-core` (always its own screen) or a multichar's resource name. */
  characterScreen: string;
  /** ESX / QB tables (`players`, `users`, `jobs`, `job_grades`) for external multichars; `auto` = while one runs. */
  frameworkTables: "auto" | "on" | "off";
}

function readUpdates(u: Record<string, unknown>): Settings["updates"] {
  const ignore = Array.isArray(u.ignore) ? u.ignore : [];
  return {
    check: bool(u.check, true),
    ignore: ignore.filter((r): r is string => typeof r === "string"),
  };
}

export function readSettings(raw: unknown): Settings {
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
    appearance: str(s.appearance, "auto", 32),
    billing: str(s.billing, "auto", 32),
    banking: str(s.banking, "auto", 32),
    bankAccounts: s.bankAccounts === "own" ? "own" : "core",
    mdt: str(s.mdt, "auto", 32),
    ems: str(s.ems, "auto", 32),
    fuel: str(s.fuel, "auto", 32),
    doorlock: str(s.doorlock, "auto", 32),
    garages: str(s.garages, "auto", 32),
    notify: str(s.notify, "ai-lib", 32),
    interaction: s.interaction === "target" ? "target" : "prompt",
    pvp: bool(s.pvp, true),
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
      choose: bool(spawn.choose, false),
      points: Array.isArray(spawn.points)
        ? spawn.points.flatMap((raw) => {
            const p = record(raw);
            const coords = readVec4(p.coords);
            const label = str(p.label, "", 48);
            return coords && label ? [{ label, coords }] : [];
          })
        : [],
    },
    characterScene: readScene(s.characterScene),
    characterScreen: str(s.characterScreen, "auto", 64),
    frameworkTables:
      s.frameworkTables === "on" || s.frameworkTables === "off"
        ? s.frameworkTables
        : "auto",
  };
}
