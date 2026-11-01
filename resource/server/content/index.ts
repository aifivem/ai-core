import { AdminPanel, DataFile } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { coreSchema } from "../admin/schema";
import { INVENTORY_NAMES } from "../inventory/names";
import { KEY_SYSTEMS } from "../vehicleKeys/registry";
import { DISPATCH_SYSTEMS } from "../dispatch/registry";
import { APPEARANCE_SYSTEM_NAMES } from "../appearance/names";
import { FUEL_SYSTEMS } from "../fuel/registry";
import { DOORLOCK_SYSTEM_NAMES } from "../doorlock/names";
import { GARAGE_SYSTEM_NAMES } from "../garages/names";
import { BILLING_CHOICES } from "../billing/registry";
import { BANKING_SYSTEMS } from "../banking/registry";
import { MDT_SYSTEMS } from "../mdt/registry";
import { EMS_CHOICES } from "../ems/registry";
import { log } from "../log";
import { ID_PATTERN, record } from "./parse";
import { readSettings, type Settings } from "./settings";
import { readAccount, readGang, readGrades, readJob } from "./definitions";

/** Panel content of ai-core (`data/*.json`), kept by the admin panel store and updated live on every panel edit. */

/** Entries of a `{ id: {...} }` file whose id is valid. */
function entries<T>(
  raw: unknown,
  read: (value: Record<string, unknown>) => T,
): Map<string, T> {
  const out = new Map<string, T>();
  for (const [id, value] of Object.entries(record(raw))) {
    if (!ID_PATTERN.test(id)) {
      log.warn(`skipped invalid id "${id}" in panel content`);
      continue;
    }
    out.set(id, read(record(value)));
  }
  return out;
}

/** Keeps a map in step with a records file of the panel (a change puts or removes one entry). */
function follow<T>(
  file: string,
  target: Map<string, T>,
  read: (value: Record<string, unknown>) => T,
): void {
  panel.onChange(file, (key, value) => {
    if (key === undefined) return;
    if (value === null) target.delete(key);
    else if (ID_PATTERN.test(key)) target.set(key, read(record(value)));
  });
}

// The pay account select lists the account types that exist at start.
const startAccounts = Object.keys(
  record(new DataFile(ResourceName, "accounts", log).read()),
);

export const panel = new AdminPanel(
  coreSchema(
    startAccounts,
    [...INVENTORY_NAMES],
    KEY_SYSTEMS.map((adapter) => adapter.resource),
    DISPATCH_SYSTEMS.map((adapter) => adapter.resource),
    [...APPEARANCE_SYSTEM_NAMES],
    FUEL_SYSTEMS.map((adapter) => adapter.resource),
    [...DOORLOCK_SYSTEM_NAMES],
    [...GARAGE_SYSTEM_NAMES],
    {
      billing: BILLING_CHOICES,
      banking: BANKING_SYSTEMS.map((adapter) => adapter.resource),
      mdt: MDT_SYSTEMS.map((adapter) => adapter.resource),
      ems: EMS_CHOICES,
    },
  ),
);

export const settings: Settings = readSettings(panel.get("settings"));
panel.onChange("settings", (_key, value) =>
  Object.assign(settings, readSettings(value)),
);

export const accountTypes = entries(panel.get("accounts"), readAccount);
export const jobs = entries(panel.get("jobs"), readJob);
export const gangs = entries(panel.get("gangs"), readGang);
follow("accounts", accountTypes, readAccount);
follow("jobs", jobs, readJob);
follow("gangs", gangs, readGang);
for (const file of ["jobs", "gangs"])
  panel.onChange(file, (key) => {
    if (key !== undefined) emit(CORE.definitionsChangedEvent, file, key);
  });

if (!jobs.has(settings.jobs.unemployed)) {
  jobs.set(settings.jobs.unemployed, {
    label: "Civilian",
    type: "none",
    defaultDuty: true,
    listed: true,
    grades: readGrades([]),
    prime: null,
  });
}
if (accountTypes.size === 0)
  accountTypes.set("cash", { label: "Cash", start: 0, allowNegative: false });
