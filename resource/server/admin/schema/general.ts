import type { TabSpec } from "@aicore-fivem/shared";
import { recommendationsCard } from "../../recommendations/schema";
import { characterScreenCard } from "../../multichar/schema";
import { layerCards, type LayerChoices } from "./layers";

/** General tab: branding, characters, saving, the layer scripts, interaction, PvP, updates, recommendations, conflicts. */
export function generalTab(choices: LayerChoices): TabSpec {
  return {
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
      characterScreenCard,
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
      ...layerCards(choices),
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
        icon: "gun",
        title: "ADMIN_C_PVP",
        desc: "ADMIN_C_PVP_DESC",
        fields: [
          {
            widget: "switch",
            path: "pvp",
            label: "ADMIN_F_PVP",
            hint: "ADMIN_H_PVP",
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
  };
}
