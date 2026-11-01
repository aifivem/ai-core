import type { TabSpec } from "@aicore-fivem/shared";
import { groupsCard, rulesCard, VRP_NEW_RULE } from "./mappingCards";

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
    rulesCard,
    groupsCard,
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
