import { spec } from "@aicore-fivem/lib/shared";
import type { DataSpec, FileSpec } from "@aicore-fivem/shared";

/**
 * `data/vrp.json` (ai-core's panel, server only): how vRP permission strings, group names and item ids map onto
 * ai-core's jobs, gangs, admin and items, plus every permission string scripts asked for (`seen`, filled by ai-core).
 * Read by `config.ts`; the panel tab is built on these sections. No FiveM code here: the web preview imports it.
 */

/** A text that may stay empty. */
const name = (
  max: number,
  extra: { lookup?: "job" | "gang"; pattern?: string } = {},
) => ({ type: "text", min: 0, max, ...extra }) satisfies DataSpec;
const bool: DataSpec = { type: "bool" };

export const VRP_DEFAULTS = {
  defaults: {
    jobPrefix: true,
    jobOnDuty: true,
    adminPrefix: true,
    playerPrefix: true,
  },
  permissions: [],
  groups: [],
  items: [],
  seen: [],
};

export const VRP_FILE: FileSpec = {
  kind: "settings",
  sync: "admin",
  sections: {
    defaults: {
      type: "object",
      fields: {
        jobPrefix: bool,
        jobOnDuty: bool,
        adminPrefix: bool,
        playerPrefix: bool,
      },
    },
    // One row per rule: the permission (exact, or a prefix ending with `*`) and the targets that hold it.
    permissions: {
      type: "list",
      max: 1000,
      of: {
        type: "object",
        fields: {
          // Empty while a new row is being filled (such a row does nothing).
          permission: {
            type: "text",
            min: 0,
            max: 100,
            pattern: "^([^\\s!]\\S*)?$",
          },
          // Who holds it (the panel's choice); the row's other targets are ignored. Absent: every filled target.
          who: {
            type: "enum",
            values: ["job", "gang", "group", "admin", "everyone"],
            optional: true,
          },
          job: name(32, { lookup: "job" }),
          gang: name(32, { lookup: "gang" }),
          group: name(64, { pattern: "^\\S*$" }),
          grade: spec.int(0, 30),
          onDuty: bool,
          admin: bool,
          everyone: bool,
        },
      },
    },
    // A vRP group name that is a job grade, a gang grade or admin; other names stay extra groups of the character.
    groups: {
      type: "list",
      max: 500,
      of: {
        type: "object",
        fields: {
          group: name(64, { pattern: "^\\S*$" }),
          who: {
            type: "enum",
            values: ["job", "gang", "admin"],
            optional: true,
          },
          job: name(32, { lookup: "job" }),
          gang: name(32, { lookup: "gang" }),
          grade: spec.int(0, 30),
          admin: bool,
        },
      },
    },
    // A vRP item id (`edible|tacos`) and the inventory item it means (plain names need no row).
    items: {
      type: "list",
      max: 2000,
      of: {
        type: "object",
        fields: {
          vrp: { type: "text", min: 0, max: 100, pattern: "^\\S*$" },
          item: { type: "text", min: 0, max: 64, lookup: "item" },
        },
      },
    },
    // Permission strings scripts asked for (ai-core adds them; the panel offers them for new rules).
    seen: { type: "names", max: 5000, itemMax: 100 },
  },
  defaults: VRP_DEFAULTS,
};
