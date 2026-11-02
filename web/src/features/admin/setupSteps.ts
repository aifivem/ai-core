import type { AdminPanelSnapshot, WidgetSpec } from "@aifivem/shared";
import { getAt } from "./path";

/** A field of some script's panel the setup guide shows (a record's field when `key` is set). */
export interface SetupField {
  resource: string;
  file: string;
  key?: string;
  path: string;
  /** Shown only while another field (of any script) holds one of `values`. */
  showIf?: { field: SetupField; values: unknown[] };
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
/** A field of the shipped paycheck office, shown while salaries are collected at an office. */
const office = (path: string): SetupField => ({
  resource: "ai-core",
  file: "paycheckOffices",
  key: "pacific_paycheck",
  path,
  showIf: { field: core("paycheck.mode"), values: ["office"] },
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
      core("paycheck.mode"),
      core("paycheck.account"),
      office("coords"),
      office("ped.coords"),
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

/** A field's current value in its script's open data (a record's field when `key` is set). */
export function valueOf(
  panels: AdminPanelSnapshot[],
  field: SetupField,
): unknown {
  const data = panels.find((p) => p.resource === field.resource)?.data[
    field.file
  ];
  const record = field.key === undefined ? data : getAt(data, field.key);
  return getAt(record, field.path);
}

/** Whether the setup guide is finished (`setupDone` in ai-core's server-local file `data/local.json`). */
export function setupDone(panels: AdminPanelSnapshot[]): boolean {
  const local = panels.find((p) => p.resource === "ai-core")?.data.local;
  return (
    typeof local === "object" &&
    local !== null &&
    Reflect.get(local, "setupDone") === true
  );
}
