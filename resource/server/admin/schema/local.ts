import type { FileSpec, TabSpec } from "@aifivem/shared";
import { bool } from "./specs";

/**
 * State of this one server (`data/local.json`, git-ignored): never part of a release, so a new install starts from the
 * defaults instead of the maintainer's server.
 */
export const localFile: FileSpec = {
  kind: "settings",
  sync: "admin",
  sections: { setupDone: bool },
  defaults: { setupDone: false },
};

/** This server tab: the setup guide's state. */
export const localTab: TabSpec = {
  id: "local",
  file: "local",
  icon: "server",
  label: "ADMIN_TAB_LOCAL",
  desc: "ADMIN_TAB_LOCAL_DESC",
  cards: [
    {
      icon: "flag-checkered",
      title: "ADMIN_C_SETUP",
      desc: "ADMIN_C_SETUP_DESC",
      fields: [
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
