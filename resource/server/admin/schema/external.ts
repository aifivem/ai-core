import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

/** Other scripts' panels: the owner's list (`data/externalPanels.json`) and its tab. */

export const externalPanelsFile: FileSpec = {
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
};

export const externalTab: TabSpec = {
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
};
