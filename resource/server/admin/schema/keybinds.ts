import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { text } from "./specs";

/** Keybinds: their records file (`data/keybinds.json`) and tab. */

// Records come from the scripts (an admin's client reports them); the owner only sets `key`.
export const keybindsFile: FileSpec = {
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
};

export const keybindsTab: TabSpec = {
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
};
