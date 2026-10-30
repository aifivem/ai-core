import type { AdminPanelSnapshot, WidgetSpec } from "@aicore-fivem/shared";

/** A field of some script's panel the setup guide shows (a record's field when `key` is set). */
export interface SetupField {
  resource: string;
  file: string;
  key?: string;
  path: string;
}

export interface SetupStep {
  id: string;
  icon: string;
  /** ai-core lang keys. */
  title: string;
  desc: string;
  fields: SetupField[];
}

const core = (path: string): SetupField => ({
  resource: "ai-core",
  file: "settings",
  path,
});
const small = (path: string): SetupField => ({
  resource: "ai-smallresources",
  file: "settings",
  path,
});

/** The setup guide: the settings a new server sets first; fields of scripts that do not run are left out. */
export const SETUP_STEPS: SetupStep[] = [
  {
    id: "server",
    icon: "server",
    title: "ADMIN_SETUP_SERVER",
    desc: "ADMIN_SETUP_SERVER_DESC",
    fields: [
      core("branding.name"),
      core("branding.subtitle"),
      core("branding.tagline"),
      core("characters.slots"),
    ],
  },
  {
    id: "spawn",
    icon: "location-dot",
    title: "ADMIN_SETUP_SPAWN",
    desc: "ADMIN_SETUP_SPAWN_DESC",
    fields: [core("spawn.default")],
  },
  {
    id: "money",
    icon: "wallet",
    title: "ADMIN_SETUP_MONEY",
    desc: "ADMIN_SETUP_MONEY_DESC",
    fields: [
      { resource: "ai-core", file: "accounts", key: "cash", path: "start" },
      { resource: "ai-core", file: "accounts", key: "bank", path: "start" },
      core("paycheck.intervalMinutes"),
      core("paycheck.account"),
    ],
  },
  {
    id: "jobs",
    icon: "briefcase",
    title: "ADMIN_SETUP_JOBS",
    desc: "ADMIN_SETUP_JOBS_DESC",
    fields: [
      core("jobs.multiJob"),
      core("jobs.maxJobs"),
      core("gangs.multiGang"),
    ],
  },
  {
    id: "play",
    icon: "hand-pointer",
    title: "ADMIN_SETUP_PLAY",
    desc: "ADMIN_SETUP_PLAY_DESC",
    fields: [core("interaction"), core("inventory"), core("vehicleKeys")],
  },
  {
    id: "world",
    icon: "map-location-dot",
    title: "ADMIN_SETUP_WORLD",
    desc: "ADMIN_SETUP_WORLD_DESC",
    fields: [
      small("noDispatch"),
      small("pedDensity"),
      small("trafficDensity"),
      small("seatbelt"),
    ],
  },
];

/** A field's widget in its script's schema (the tab showing that file), or null when the script does not run. */
export function widgetOf(
  panels: AdminPanelSnapshot[],
  field: SetupField,
): { panel: AdminPanelSnapshot; spec: WidgetSpec } | null {
  const panel = panels.find((p) => p.resource === field.resource);
  if (!panel) return null;
  for (const tab of panel.schema.tabs)
    if (tab.file === field.file)
      for (const card of tab.cards)
        for (const spec of card.fields)
          if (spec.path === field.path) return { panel, spec };
  return null;
}

/** Whether the setup guide is finished (ai-core's `setupDone` setting). */
export function setupDone(panels: AdminPanelSnapshot[]): boolean {
  const settings = panels.find((p) => p.resource === "ai-core")?.data.settings;
  return (
    typeof settings === "object" &&
    settings !== null &&
    Reflect.get(settings, "setupDone") === true
  );
}
