import { spec } from "@aicore-fivem/lib/shared";
import type {
  DataSpec,
  FileSpec,
  TabSpec,
  WidgetSpec,
} from "@aicore-fivem/shared";

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

/** A grade picker for the job / gang named in the same row, shown while `who` picks it. */
const gradeRow = (of: "job" | "gang"): WidgetSpec => ({
  widget: "grade",
  path: "grade",
  of,
  lookup: of,
  label: "ADMIN_F_VRP_GRADE",
  hint: "ADMIN_H_VRP_GRADE",
  showIf: { path: "who", values: [of] },
});

const jobRow: WidgetSpec = {
  widget: "text",
  path: "job",
  lookup: "job",
  label: "ADMIN_F_VRP_JOB",
  placeholder: "ADMIN_PH_VRP_JOB",
  showIf: { path: "who", values: ["job"] },
};

const gangRow: WidgetSpec = {
  widget: "text",
  path: "gang",
  lookup: "gang",
  label: "ADMIN_F_VRP_GANG",
  placeholder: "ADMIN_PH_VRP_GANG",
  showIf: { path: "who", values: ["gang"] },
};

/** A new permission rule: admins only until the owner picks who holds it (a rule replaces the defaults). */
export const VRP_NEW_RULE = {
  permission: "",
  who: "admin",
  job: "",
  gang: "",
  group: "",
  grade: 0,
  onDuty: true,
  admin: false,
  everyone: false,
};

/** The vRP tab of ai-core's panel (`data/vrp.json`). */
export const VRP_TAB: TabSpec = {
  id: "vrp",
  file: "vrp",
  icon: "key",
  label: "ADMIN_TAB_VRP",
  desc: "ADMIN_TAB_VRP_DESC",
  cards: [
    {
      icon: "sliders",
      title: "ADMIN_C_VRP_DEFAULTS",
      desc: "ADMIN_C_VRP_DEFAULTS_DESC",
      fields: [
        {
          widget: "switch",
          path: "defaults.jobPrefix",
          label: "ADMIN_F_VRP_JOB_PREFIX",
          hint: "ADMIN_H_VRP_JOB_PREFIX",
        },
        {
          widget: "switch",
          path: "defaults.jobOnDuty",
          label: "ADMIN_F_VRP_JOB_ON_DUTY",
          hint: "ADMIN_H_VRP_JOB_ON_DUTY",
          showIf: { path: "defaults.jobPrefix", values: [true] },
        },
        {
          widget: "switch",
          path: "defaults.adminPrefix",
          label: "ADMIN_F_VRP_ADMIN_PREFIX",
          hint: "ADMIN_H_VRP_ADMIN_PREFIX",
        },
        {
          widget: "switch",
          path: "defaults.playerPrefix",
          label: "ADMIN_F_VRP_PLAYER_PREFIX",
          hint: "ADMIN_H_VRP_PLAYER_PREFIX",
        },
      ],
    },
    {
      icon: "key",
      title: "ADMIN_C_VRP_RULES",
      desc: "ADMIN_C_VRP_RULES_DESC",
      fields: [
        {
          widget: "list",
          path: "permissions",
          label: "ADMIN_F_VRP_RULES",
          hint: "ADMIN_H_VRP_RULES",
          addLabel: "ADMIN_ADD_VRP_RULE",
          newRow: VRP_NEW_RULE,
          min: 0,
          max: 1000,
          search: true,
          wrap: true,
          rows: [
            {
              widget: "text",
              path: "permission",
              label: "ADMIN_F_VRP_PERMISSION",
              placeholder: "ADMIN_PH_VRP_PERMISSION",
            },
            {
              widget: "select",
              path: "who",
              label: "ADMIN_F_VRP_WHO",
              options: [
                { value: "job", label: "ADMIN_O_VRP_JOB" },
                { value: "gang", label: "ADMIN_O_VRP_GANG" },
                { value: "group", label: "ADMIN_O_VRP_GROUP" },
                { value: "admin", label: "ADMIN_O_VRP_ADMIN" },
                { value: "everyone", label: "ADMIN_O_VRP_EVERYONE" },
              ],
            },
            jobRow,
            gradeRow("job"),
            {
              widget: "switch",
              path: "onDuty",
              label: "ADMIN_F_VRP_ON_DUTY",
              showIf: { path: "who", values: ["job"] },
            },
            gangRow,
            gradeRow("gang"),
            {
              widget: "text",
              path: "group",
              label: "ADMIN_F_VRP_GROUP",
              placeholder: "ADMIN_PH_VRP_GROUP",
              showIf: { path: "who", values: ["group"] },
            },
          ],
        },
      ],
    },
    {
      icon: "users",
      title: "ADMIN_C_VRP_GROUPS",
      desc: "ADMIN_C_VRP_GROUPS_DESC",
      fields: [
        {
          widget: "list",
          path: "groups",
          label: "ADMIN_F_VRP_GROUPS",
          hint: "ADMIN_H_VRP_GROUPS",
          addLabel: "ADMIN_ADD_VRP_GROUP",
          newRow: {
            group: "",
            who: "job",
            job: "",
            gang: "",
            grade: 0,
            admin: false,
          },
          min: 0,
          max: 500,
          search: true,
          wrap: true,
          rows: [
            {
              widget: "text",
              path: "group",
              label: "ADMIN_F_VRP_GROUP_NAME",
              placeholder: "ADMIN_PH_VRP_GROUP_NAME",
            },
            {
              widget: "select",
              path: "who",
              label: "ADMIN_F_VRP_MEANS",
              options: [
                { value: "job", label: "ADMIN_O_VRP_JOB_GRADE" },
                { value: "gang", label: "ADMIN_O_VRP_GANG_GRADE" },
                { value: "admin", label: "ADMIN_O_VRP_ADMIN" },
              ],
            },
            jobRow,
            gradeRow("job"),
            gangRow,
            gradeRow("gang"),
          ],
        },
      ],
    },
    {
      icon: "box-open",
      title: "ADMIN_C_VRP_ITEMS",
      desc: "ADMIN_C_VRP_ITEMS_DESC",
      fields: [
        {
          widget: "list",
          path: "items",
          label: "ADMIN_F_VRP_ITEMS",
          hint: "ADMIN_H_VRP_ITEMS",
          addLabel: "ADMIN_ADD_VRP_ITEM",
          newRow: { vrp: "", item: "" },
          min: 0,
          max: 2000,
          search: true,
          rows: [
            {
              widget: "text",
              path: "vrp",
              label: "ADMIN_F_VRP_ITEM_ID",
              placeholder: "ADMIN_PH_VRP_ITEM_ID",
            },
            {
              widget: "text",
              path: "item",
              lookup: "item",
              label: "ADMIN_F_VRP_ITEM",
              placeholder: "ADMIN_PH_VRP_ITEM",
            },
          ],
        },
      ],
    },
    {
      icon: "list",
      title: "ADMIN_C_VRP_SEEN",
      desc: "ADMIN_C_VRP_SEEN_DESC",
      fields: [
        {
          widget: "browse",
          path: "seen",
          label: "ADMIN_F_VRP_SEEN",
          hint: "ADMIN_H_VRP_SEEN",
          addTo: {
            path: "permissions",
            field: "permission",
            newRow: VRP_NEW_RULE,
            label: "ADMIN_ADD_VRP_RULE_FOR",
            doneLabel: "ADMIN_VRP_HAS_RULE",
          },
        },
      ],
    },
  ],
};
