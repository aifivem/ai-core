import type { TabSpec } from "@aicore-fivem/shared";

/** Spawn tab: the first spawn point and the places players pick from (settings `spawn`). */
export const spawnTab: TabSpec = {
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
    {
      icon: "map-location-dot",
      title: "ADMIN_C_SPAWN_CHOICE",
      desc: "ADMIN_C_SPAWN_CHOICE_DESC",
      fields: [
        {
          widget: "switch",
          path: "spawn.choose",
          label: "ADMIN_F_SPAWN_CHOOSE",
          hint: "ADMIN_H_SPAWN_CHOOSE",
        },
        {
          widget: "list",
          path: "spawn.points",
          label: "ADMIN_F_SPAWN_POINTS",
          addLabel: "ADMIN_ADD_SPAWN_POINT",
          max: 20,
          newRow: { label: "", coords: { x: 0, y: 0, z: 0, heading: 0 } },
          rows: [
            {
              widget: "text",
              path: "label",
              label: "ADMIN_F_SPAWN_LABEL",
              placeholder: "ADMIN_P_SPAWN_LABEL",
            },
            {
              widget: "point",
              path: "coords",
              label: "ADMIN_F_SPAWN_POINT",
              heading: true,
              ground: true,
            },
          ],
        },
      ],
    },
  ],
};
