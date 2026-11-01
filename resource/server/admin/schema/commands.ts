import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

/** Commands: a memory file the scripts fill (never saved) and its read-only table tab. */

export const commandsFile: FileSpec = {
  kind: "records",
  sync: "admin",
  memory: true,
  sections: {},
};

export const commandsTab: TabSpec = {
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
};
