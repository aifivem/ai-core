import type { CardSpec, DataSpec } from "@aicore-fivem/shared";
import { MULTICHARS } from "./registry";

/** Settings sections and the General tab card of the character screen pick (no FiveM code: the web preview imports it). */
export const CHARACTER_SCREEN_SECTIONS: Record<string, DataSpec> = {
  characterScreen: {
    type: "enum",
    values: ["auto", "ai-core", ...MULTICHARS.map((m) => m.resource)],
  },
  frameworkTables: { type: "enum", values: ["auto", "on", "off"] },
  // Written by ai-core (multichar/screen.ts), shown read only.
  characterScreenActive: { type: "text", min: 0, max: 64, optional: true },
};

export const CHARACTER_SCREEN_DEFAULTS = {
  characterScreen: "auto",
  frameworkTables: "auto",
};

export const characterScreenCard: CardSpec = {
  icon: "id-card",
  title: "ADMIN_C_CHARACTER_SCREEN",
  desc: "ADMIN_C_CHARACTER_SCREEN_DESC",
  fields: [
    {
      widget: "select",
      path: "characterScreen",
      label: "ADMIN_F_CHARACTER_SCREEN",
      hint: "ADMIN_H_CHARACTER_SCREEN",
      options: [
        { value: "auto", label: "ADMIN_O_CHARACTER_SCREEN_AUTO" },
        { value: "ai-core", label: "ADMIN_O_CHARACTER_SCREEN_CORE" },
        ...MULTICHARS.map(({ resource }) => ({
          value: resource,
          label: resource,
        })),
      ],
    },
    {
      widget: "info",
      path: "characterScreenActive",
      label: "ADMIN_F_CHARACTER_SCREEN_ACTIVE",
      hint: "ADMIN_H_CHARACTER_SCREEN_ACTIVE",
      // A script's name shows as it is.
      values: { "ai-core": "ADMIN_O_CHARACTER_SCREEN_CORE" },
    },
    {
      widget: "select",
      path: "frameworkTables",
      label: "ADMIN_F_FRAMEWORK_TABLES",
      hint: "ADMIN_H_FRAMEWORK_TABLES",
      options: [
        { value: "auto", label: "ADMIN_O_FRAMEWORK_TABLES_AUTO" },
        { value: "on", label: "ADMIN_O_FRAMEWORK_TABLES_ON" },
        { value: "off", label: "ADMIN_O_FRAMEWORK_TABLES_OFF" },
      ],
    },
  ],
};
