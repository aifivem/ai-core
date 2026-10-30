import type { DataSpec, PanelSchema, WidgetSpec } from "@aicore-fivem/shared";
import { DEFAULT_SCENE } from "../content/scene";
import { DEFAULT_PRIME_TIME, PRIME_SOURCES } from "../content/primeTime";
import { jobPrimeCard, primeTimeCard } from "./primeTimeSchema";
import { sceneSection, sceneTab } from "./sceneSchema";
import {
  DEFAULT_RECOMMENDATIONS,
  RECOMMENDATIONS_SECTION,
  recommendationsCard,
} from "../recommendations/schema";

/** ai-core's own panel: server settings, spawn points, character screen scene, job rules, jobs, gangs and money accounts (`data/*.json`). */

const ID = "^[a-z0-9_]{2,32}$";
const text = (max: number, min = 1): DataSpec => ({ type: "text", min, max });
const int = (min: number, max: number): DataSpec => ({
  type: "number",
  min,
  max,
  integer: true,
});
const bool: DataSpec = { type: "bool" };
const grades: DataSpec = {
  type: "list",
  min: 1,
  max: 30,
  of: {
    type: "object",
    fields: {
      label: text(48),
      salary: int(0, 1_000_000),
      offPrimePayment: { ...int(0, 1_000_000), optional: true },
      boss: { type: "bool", optional: true },
    },
  },
};
const hour = int(0, 23);
const optionalHour: DataSpec = { ...hour, optional: true };

const gradeRows = (salary: boolean): WidgetSpec[] => [
  {
    widget: "text",
    path: "label",
    label: "ADMIN_F_GRADE_NAME",
    placeholder: "ADMIN_PH_GRADE",
  },
  ...(salary
    ? [
        {
          widget: "number",
          path: "salary",
          label: "ADMIN_F_SALARY",
          min: 0,
          step: 5,
          unit: "$",
        } satisfies WidgetSpec,
        {
          widget: "number",
          path: "offPrimePayment",
          label: "ADMIN_F_OFF_PRIME_PAYMENT",
          min: 0,
          step: 5,
          unit: "$",
        } satisfies WidgetSpec,
      ]
    : []),
  { widget: "switch", path: "boss", label: "ADMIN_F_BOSS" },
];

/** `accounts`: the account types at start, offered where an account is picked; `inventories` / `keySystems` / `alertSystems`: the adapters. */
export function coreSchema(
  accounts: string[],
  inventories: string[] = [],
  keySystems: string[] = [],
  alertSystems: string[] = [],
): PanelSchema {
  const accountOptions = accounts.map((value) => ({ value, label: value }));
  return {
    title: "ADMIN_CORE_TITLE",
    icon: "server",
    files: {
      settings: {
        kind: "settings",
        sync: "admin",
        sections: {
          branding: {
            type: "object",
            fields: {
              name: text(32),
              subtitle: text(32),
              tagline: text(48, 0),
              taglineSub: text(64, 0),
              background: { type: "enum", values: ["skyline", "wet-drive"] },
            },
          },
          characters: {
            type: "object",
            fields: { slots: int(1, 10), canDelete: bool, minAge: int(0, 99) },
          },
          jobs: {
            type: "object",
            fields: {
              multiJob: bool,
              maxJobs: int(1, 20),
              unemployed: { type: "text", max: 32, pattern: ID },
              restoreDuty: bool,
            },
          },
          gangs: {
            type: "object",
            fields: { multiGang: bool, maxGangs: int(1, 20) },
          },
          paycheck: {
            type: "object",
            fields: {
              intervalMinutes: int(0, 1440),
              account: { type: "text", max: 32, pattern: ID },
              fromJobAccount: bool,
            },
          },
          primeTime: {
            type: "object",
            fields: {
              enabled: bool,
              source: { type: "enum", values: [...PRIME_SOURCES] },
              offPrimeMultiplier: { type: "number", min: 0, max: 1 },
              start: hour,
              finish: hour,
            },
          },
          // Written by ai-core (jobs/primeTime), shown read only.
          primeTimeActive: {
            type: "enum",
            values: ["none", ...PRIME_SOURCES.filter((s) => s !== "auto")],
            optional: true,
          },
          saveIntervalMinutes: int(1, 60),
          inventory: { type: "enum", values: ["auto", ...inventories] },
          vehicleKeys: { type: "enum", values: ["auto", ...keySystems] },
          dispatch: { type: "enum", values: ["auto", ...alertSystems] },
          interaction: { type: "enum", values: ["prompt", "target"] },
          refuseOnConflict: { type: "bool" },
          setupDone: { type: "bool" },
          updates: {
            type: "object",
            fields: {
              check: { type: "bool" },
              ignore: {
                type: "names",
                lookup: "resource",
                max: 64,
                itemMax: 64,
              },
            },
          },
          recommendations: RECOMMENDATIONS_SECTION,
          spawn: {
            type: "object",
            fields: { default: { type: "vec4" } },
          },
          characterScene: sceneSection,
        },
        defaults: {
          characterScene: DEFAULT_SCENE,
          primeTime: DEFAULT_PRIME_TIME,
          inventory: "auto",
          vehicleKeys: "auto",
          dispatch: "auto",
          interaction: "prompt",
          refuseOnConflict: true,
          setupDone: false,
          updates: { check: true, ignore: [] },
          recommendations: DEFAULT_RECOMMENDATIONS,
        },
      },
      jobs: {
        kind: "records",
        sync: "admin",
        labelPath: "label",
        locked: ["unemployed"],
        newRecord: {
          type: "none",
          defaultDuty: false,
          grades: [{ label: "Member", salary: 0 }],
          primeOwn: false,
          primeStart: DEFAULT_PRIME_TIME.start,
          primeFinish: DEFAULT_PRIME_TIME.finish,
        },
        sections: {
          label: text(48),
          type: { type: "text", max: 32, pattern: ID },
          defaultDuty: bool,
          grades,
          primeOwn: { type: "bool", optional: true },
          primeStart: optionalHour,
          primeFinish: optionalHour,
        },
      },
      gangs: {
        kind: "records",
        sync: "admin",
        labelPath: "label",
        newRecord: { grades: [{ label: "Member", salary: 0 }] },
        sections: { label: text(48), grades },
      },
      accounts: {
        kind: "records",
        sync: "admin",
        labelPath: "label",
        locked: accounts,
        newRecord: { start: 0, allowNegative: false },
        sections: {
          label: text(48),
          start: int(0, 100_000_000),
          allowNegative: bool,
        },
      },
      // Records come from the scripts (an admin's client reports them); the owner only sets `key`.
      keybinds: {
        kind: "records",
        sync: "all",
        labelPath: "description",
        sections: {
          resource: text(64),
          description: text(120, 0),
          defaultKey: text(32, 0),
          mapper: text(32),
          key: { type: "text", min: 0, max: 32, pattern: "^[A-Za-z0-9_]*$" },
          hintWhen: {
            type: "enum",
            values: ["", "foot", "vehicle", "always"],
            optional: true,
          },
          hint: {
            type: "enum",
            values: ["", "never", "foot", "vehicle", "always"],
            optional: true,
          },
        },
      },
      commands: { kind: "records", sync: "admin", memory: true, sections: {} },
      externalPanels: {
        kind: "records",
        sync: "admin",
        labelPath: "label",
        newRecord: {
          label: "",
          resource: "",
          command: "",
          url: "",
          icon: "puzzle-piece",
          description: "",
        },
        sections: {
          label: { type: "text", min: 1, max: 48 },
          resource: {
            type: "text",
            min: 0,
            max: 64,
            pattern: "^[A-Za-z0-9_.-]*$",
          },
          command: {
            type: "text",
            min: 0,
            max: 64,
            pattern: "^/?[A-Za-z0-9_:.-]*$",
          },
          url: { type: "text", min: 0, max: 300, pattern: "^(https://.*)?$" },
          icon: { type: "text", min: 0, max: 32 },
          description: { type: "text", min: 0, max: 160 },
        },
      },
    },
    tabs: [
      {
        id: "general",
        file: "settings",
        icon: "sliders",
        label: "ADMIN_TAB_GENERAL",
        desc: "ADMIN_TAB_GENERAL_DESC",
        cards: [
          {
            icon: "tag",
            title: "ADMIN_C_BRANDING",
            desc: "ADMIN_C_BRANDING_DESC",
            fields: [
              {
                widget: "text",
                path: "branding.name",
                label: "ADMIN_F_SERVER_NAME",
                placeholder: "ADMIN_PH_SERVER_NAME",
              },
              {
                widget: "text",
                path: "branding.subtitle",
                label: "ADMIN_F_SUBTITLE",
                placeholder: "ADMIN_PH_SUBTITLE",
              },
              {
                widget: "text",
                path: "branding.tagline",
                label: "ADMIN_F_TAGLINE",
                placeholder: "ADMIN_PH_TAGLINE",
              },
              {
                widget: "text",
                path: "branding.taglineSub",
                label: "ADMIN_F_TAGLINE_SUB",
                placeholder: "ADMIN_PH_TAGLINE_SUB",
              },
              {
                widget: "select",
                path: "branding.background",
                label: "ADMIN_F_BACKGROUND",
                hint: "ADMIN_H_BACKGROUND",
                options: [
                  { value: "skyline", label: "ADMIN_O_SKYLINE" },
                  { value: "wet-drive", label: "ADMIN_O_WET_DRIVE" },
                ],
              },
            ],
          },
          {
            icon: "users",
            title: "ADMIN_C_CHARACTERS",
            desc: "ADMIN_C_CHARACTERS_DESC",
            fields: [
              {
                widget: "number",
                path: "characters.slots",
                label: "ADMIN_F_SLOTS",
                hint: "ADMIN_H_SLOTS",
                min: 1,
                max: 10,
              },
              {
                widget: "switch",
                path: "characters.canDelete",
                label: "ADMIN_F_CAN_DELETE",
                hint: "ADMIN_H_CAN_DELETE",
              },
              {
                widget: "number",
                path: "characters.minAge",
                label: "ADMIN_F_MIN_AGE",
                min: 0,
                max: 99,
                unit: "ADMIN_U_YEARS",
              },
            ],
          },
          {
            icon: "floppy-disk",
            title: "ADMIN_C_SAVING",
            desc: "ADMIN_C_SAVING_DESC",
            fields: [
              {
                widget: "number",
                path: "saveIntervalMinutes",
                label: "ADMIN_F_SAVE_INTERVAL",
                min: 1,
                max: 60,
                unit: "ADMIN_U_MINUTES",
              },
            ],
          },
          {
            icon: "box-open",
            title: "ADMIN_C_INVENTORY",
            desc: "ADMIN_C_INVENTORY_DESC",
            fields: [
              {
                widget: "select",
                path: "inventory",
                label: "ADMIN_F_INVENTORY",
                hint: "ADMIN_H_INVENTORY",
                options: [
                  { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
                  ...inventories.map((value) => ({ value, label: value })),
                ],
              },
            ],
          },
          {
            icon: "key",
            title: "ADMIN_C_VEHICLE_KEYS",
            desc: "ADMIN_C_VEHICLE_KEYS_DESC",
            fields: [
              {
                widget: "select",
                path: "vehicleKeys",
                label: "ADMIN_F_VEHICLE_KEYS",
                hint: "ADMIN_H_VEHICLE_KEYS",
                options: [
                  { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
                  ...keySystems.map((value) => ({ value, label: value })),
                ],
              },
            ],
          },
          {
            icon: "triangle-exclamation",
            title: "ADMIN_C_DISPATCH",
            desc: "ADMIN_C_DISPATCH_DESC",
            fields: [
              {
                widget: "select",
                path: "dispatch",
                label: "ADMIN_F_DISPATCH",
                hint: "ADMIN_H_DISPATCH",
                options: [
                  { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
                  ...alertSystems.map((value) => ({ value, label: value })),
                ],
              },
            ],
          },
          {
            icon: "hand-pointer",
            title: "ADMIN_C_INTERACTION",
            desc: "ADMIN_C_INTERACTION_DESC",
            fields: [
              {
                widget: "select",
                path: "interaction",
                label: "ADMIN_F_INTERACTION",
                hint: "ADMIN_H_INTERACTION",
                options: [
                  { value: "prompt", label: "ADMIN_O_INTERACTION_PROMPT" },
                  { value: "target", label: "ADMIN_O_INTERACTION_TARGET" },
                ],
              },
            ],
          },
          {
            icon: "cloud-arrow-down",
            title: "ADMIN_C_UPDATES",
            desc: "ADMIN_C_UPDATES_DESC",
            fields: [
              {
                widget: "switch",
                path: "updates.check",
                label: "ADMIN_F_UPDATES_CHECK",
                hint: "ADMIN_H_UPDATES_CHECK",
              },
              {
                widget: "tags",
                lookup: "resource",
                path: "updates.ignore",
                label: "ADMIN_F_UPDATES_IGNORE",
                hint: "ADMIN_H_UPDATES_IGNORE",
                placeholder: "ADMIN_PH_UPDATES_IGNORE",
              },
            ],
          },
          recommendationsCard,
          {
            icon: "shield",
            title: "ADMIN_C_CONFLICTS",
            desc: "ADMIN_C_CONFLICTS_DESC",
            fields: [
              {
                widget: "switch",
                path: "refuseOnConflict",
                label: "ADMIN_F_REFUSE_ON_CONFLICT",
                hint: "ADMIN_H_REFUSE_ON_CONFLICT",
              },
              {
                widget: "switch",
                path: "setupDone",
                label: "ADMIN_F_SETUP_DONE",
                hint: "ADMIN_H_SETUP_DONE",
              },
            ],
          },
        ],
      },
      {
        id: "spawn",
        file: "settings",
        icon: "location-dot",
        label: "ADMIN_TAB_SPAWN",
        desc: "ADMIN_TAB_SPAWN_DESC",
        cards: [
          {
            icon: "plane-arrival",
            title: "ADMIN_C_FIRST_SPAWN",
            desc: "ADMIN_C_FIRST_SPAWN_DESC",
            fields: [
              {
                widget: "point",
                path: "spawn.default",
                label: "ADMIN_F_SPAWN_POINT",
                heading: true,
              },
            ],
          },
        ],
      },
      sceneTab,
      {
        id: "rules",
        file: "settings",
        icon: "scale-balanced",
        label: "ADMIN_TAB_RULES",
        desc: "ADMIN_TAB_RULES_DESC",
        cards: [
          {
            icon: "briefcase",
            title: "ADMIN_C_JOB_RULES",
            desc: "ADMIN_C_JOB_RULES_DESC",
            fields: [
              {
                widget: "switch",
                path: "jobs.multiJob",
                label: "ADMIN_F_MULTI_JOB",
                hint: "ADMIN_H_MULTI_JOB",
              },
              {
                widget: "number",
                path: "jobs.maxJobs",
                label: "ADMIN_F_MAX_JOBS",
                min: 1,
                max: 20,
              },
              {
                widget: "switch",
                path: "jobs.restoreDuty",
                label: "ADMIN_F_RESTORE_DUTY",
                hint: "ADMIN_H_RESTORE_DUTY",
              },
            ],
          },
          {
            icon: "people-group",
            title: "ADMIN_C_GANG_RULES",
            desc: "ADMIN_C_GANG_RULES_DESC",
            fields: [
              {
                widget: "switch",
                path: "gangs.multiGang",
                label: "ADMIN_F_MULTI_GANG",
              },
              {
                widget: "number",
                path: "gangs.maxGangs",
                label: "ADMIN_F_MAX_GANGS",
                min: 1,
                max: 20,
              },
            ],
          },
          {
            icon: "money-bill-wave",
            title: "ADMIN_C_PAYCHECK",
            desc: "ADMIN_C_PAYCHECK_DESC",
            fields: [
              {
                widget: "number",
                path: "paycheck.intervalMinutes",
                label: "ADMIN_F_PAY_INTERVAL",
                hint: "ADMIN_H_PAY_INTERVAL",
                min: 0,
                max: 1440,
                unit: "ADMIN_U_MINUTES",
              },
              {
                widget: "select",
                path: "paycheck.account",
                label: "ADMIN_F_PAY_ACCOUNT",
                options: accountOptions,
              },
              {
                widget: "switch",
                path: "paycheck.fromJobAccount",
                label: "ADMIN_F_FROM_JOB_ACCOUNT",
                hint: "ADMIN_H_FROM_JOB_ACCOUNT",
              },
            ],
          },
          primeTimeCard,
        ],
      },
      {
        id: "jobs",
        file: "jobs",
        icon: "briefcase",
        label: "ADMIN_TAB_JOBS",
        desc: "ADMIN_TAB_JOBS_DESC",
        listSub: "type",
        createLabel: "ADMIN_NEW_JOB",
        deleteLabel: "ADMIN_DELETE_JOB",
        cards: [
          {
            icon: "id-card",
            title: "ADMIN_C_JOB",
            fields: [
              {
                widget: "text",
                path: "label",
                label: "ADMIN_F_NAME",
                placeholder: "ADMIN_PH_JOB",
              },
              {
                widget: "text",
                path: "type",
                label: "ADMIN_F_JOB_TYPE",
                hint: "ADMIN_H_JOB_TYPE",
                placeholder: "ADMIN_PH_JOB_TYPE",
              },
              {
                widget: "switch",
                path: "defaultDuty",
                label: "ADMIN_F_DEFAULT_DUTY",
                hint: "ADMIN_H_DEFAULT_DUTY",
              },
            ],
          },
          {
            icon: "ranking-star",
            title: "ADMIN_C_GRADES",
            desc: "ADMIN_C_GRADES_DESC",
            fields: [
              {
                widget: "list",
                path: "grades",
                label: "",
                rows: gradeRows(true),
                newRow: { label: "Grade", salary: 0, offPrimePayment: 0 },
                addLabel: "ADMIN_ADD_GRADE",
                rowLabel: "ADMIN_ROW_GRADE",
                max: 30,
              },
            ],
          },
          jobPrimeCard,
        ],
      },
      {
        id: "gangs",
        file: "gangs",
        icon: "people-group",
        label: "ADMIN_TAB_GANGS",
        desc: "ADMIN_TAB_GANGS_DESC",
        createLabel: "ADMIN_NEW_GANG",
        deleteLabel: "ADMIN_DELETE_GANG",
        cards: [
          {
            icon: "id-card",
            title: "ADMIN_C_GANG",
            fields: [
              {
                widget: "text",
                path: "label",
                label: "ADMIN_F_NAME",
                placeholder: "ADMIN_PH_GANG",
              },
            ],
          },
          {
            icon: "ranking-star",
            title: "ADMIN_C_GRADES",
            desc: "ADMIN_C_GANG_GRADES_DESC",
            fields: [
              {
                widget: "list",
                path: "grades",
                label: "",
                rows: gradeRows(false),
                newRow: { label: "Grade", salary: 0 },
                addLabel: "ADMIN_ADD_GRADE",
                rowLabel: "ADMIN_ROW_GRADE",
                max: 30,
              },
            ],
          },
        ],
      },
      {
        id: "accounts",
        file: "accounts",
        icon: "wallet",
        label: "ADMIN_TAB_ACCOUNTS",
        desc: "ADMIN_TAB_ACCOUNTS_DESC",
        createLabel: "ADMIN_NEW_ACCOUNT",
        deleteLabel: "ADMIN_DELETE_ACCOUNT",
        cards: [
          {
            icon: "wallet",
            title: "ADMIN_C_ACCOUNT",
            fields: [
              {
                widget: "text",
                path: "label",
                label: "ADMIN_F_NAME",
                placeholder: "ADMIN_PH_ACCOUNT",
              },
              {
                widget: "number",
                path: "start",
                label: "ADMIN_F_START",
                hint: "ADMIN_H_START",
                min: 0,
                step: 100,
                unit: "$",
              },
              {
                widget: "switch",
                path: "allowNegative",
                label: "ADMIN_F_NEGATIVE",
                hint: "ADMIN_H_NEGATIVE",
              },
            ],
          },
        ],
      },
      {
        id: "external",
        file: "externalPanels",
        icon: "puzzle-piece",
        label: "ADMIN_TAB_EXTERNAL",
        desc: "ADMIN_TAB_EXTERNAL_DESC",
        createLabel: "ADMIN_NEW_EXTERNAL",
        deleteLabel: "ADMIN_DELETE_EXTERNAL",
        cards: [
          {
            icon: "puzzle-piece",
            title: "ADMIN_C_EXTERNAL",
            desc: "ADMIN_C_EXTERNAL_DESC",
            fields: [
              {
                widget: "text",
                path: "label",
                label: "ADMIN_F_EXT_LABEL",
                placeholder: "ADMIN_PH_EXT_LABEL",
              },
              {
                widget: "text",
                path: "resource",
                label: "ADMIN_F_EXT_RESOURCE",
                hint: "ADMIN_H_EXT_RESOURCE",
                placeholder: "ADMIN_PH_EXT_RESOURCE",
              },
              {
                widget: "text",
                path: "command",
                label: "ADMIN_F_EXT_COMMAND",
                hint: "ADMIN_H_EXT_COMMAND",
                placeholder: "ADMIN_PH_EXT_COMMAND",
              },
              {
                widget: "text",
                path: "url",
                label: "ADMIN_F_EXT_URL",
                hint: "ADMIN_H_EXT_URL",
                placeholder: "ADMIN_PH_EXT_URL",
              },
              {
                widget: "text",
                path: "description",
                label: "ADMIN_F_EXT_DESCRIPTION",
                placeholder: "ADMIN_PH_EXT_DESCRIPTION",
              },
            ],
          },
        ],
      },
      {
        id: "keybinds",
        file: "keybinds",
        icon: "keyboard",
        label: "ADMIN_TAB_KEYBINDS",
        desc: "ADMIN_TAB_KEYBINDS_DESC",
        listSub: "resource",
        cards: [
          {
            icon: "keyboard",
            title: "ADMIN_C_KEYBIND",
            desc: "ADMIN_C_KEYBIND_DESC",
            fields: [
              {
                widget: "info",
                path: "resource",
                label: "ADMIN_F_SCRIPT",
                mono: true,
              },
              {
                widget: "info",
                path: "mapper",
                label: "ADMIN_F_DEVICE",
                values: {
                  keyboard: "ADMIN_O_KEYBOARD",
                  MOUSE_BUTTON: "ADMIN_O_MOUSE",
                  PAD_DIGITALBUTTON: "ADMIN_O_PAD",
                },
              },
              {
                widget: "info",
                path: "defaultKey",
                label: "ADMIN_F_SCRIPT_KEY",
                mono: true,
                empty: "ADMIN_NO_KEY",
              },
              {
                widget: "text",
                path: "key",
                label: "ADMIN_F_DEFAULT_KEY",
                hint: "ADMIN_H_DEFAULT_KEY",
                placeholder: "ADMIN_PH_KEYBIND",
              },
              {
                widget: "info",
                path: "hintWhen",
                label: "ADMIN_F_HINT_SCRIPT",
                values: {
                  foot: "ADMIN_O_HINT_FOOT",
                  vehicle: "ADMIN_O_HINT_VEHICLE",
                  always: "ADMIN_O_HINT_ALWAYS",
                },
                empty: "ADMIN_O_HINT_NEVER",
              },
              {
                widget: "select",
                path: "hint",
                label: "ADMIN_F_HINT",
                hint: "ADMIN_H_HINT",
                options: [
                  { value: "", label: "ADMIN_O_HINT_SCRIPT" },
                  { value: "never", label: "ADMIN_O_HINT_NEVER" },
                  { value: "foot", label: "ADMIN_O_HINT_FOOT" },
                  { value: "vehicle", label: "ADMIN_O_HINT_VEHICLE" },
                  { value: "always", label: "ADMIN_O_HINT_ALWAYS" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "commands",
        file: "commands",
        icon: "terminal",
        label: "ADMIN_TAB_COMMANDS",
        desc: "ADMIN_TAB_COMMANDS_DESC",
        cards: [],
        table: {
          sort: "name",
          columns: [
            {
              path: "usage",
              label: "ADMIN_COL_COMMAND",
              mono: true,
              width: 2.2,
            },
            {
              path: "help",
              label: "ADMIN_COL_HELP",
              width: 3,
              empty: "ADMIN_CMD_NO_HELP",
            },
            {
              path: "aliases",
              label: "ADMIN_COL_ALIASES",
              mono: true,
              width: 1,
              empty: "ADMIN_NONE",
            },
            {
              path: "access",
              label: "ADMIN_COL_ACCESS",
              mono: true,
              width: 1.4,
              empty: "ADMIN_CMD_EVERYONE",
              values: { "?": "ADMIN_CMD_UNDECLARED" },
            },
            {
              path: "resource",
              label: "ADMIN_COL_SCRIPT",
              mono: true,
              width: 1.2,
            },
            {
              path: "kind",
              label: "ADMIN_COL_KIND",
              width: 1,
              values: {
                lib: "ADMIN_CMD_KIND_LIB",
                plain: "ADMIN_CMD_KIND_PLAIN",
              },
            },
          ],
        },
      },
    ],
  };
}
