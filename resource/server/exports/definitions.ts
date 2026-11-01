import { registerExport } from "@aicore-fivem/lib/server";
import {
  accountTypes,
  gangs as gangDefs,
  jobs as jobDefs,
  settings,
} from "../content";
import { runtimeGangs, runtimeJobs } from "../jobs/runtime";

/** Exports of panel content (branding, job / gang definitions, account types) and of scripts' own definitions. */

registerExport("GetBranding", () => ({ ...settings.branding }));
registerExport("GetJobDefinitions", () => Object.fromEntries(jobDefs));
registerExport("GetGangDefinitions", () => Object.fromEntries(gangDefs));
registerExport("GetJobDefinition", (job: unknown) =>
  typeof job === "string" ? (jobDefs.get(job) ?? null) : null,
);
registerExport("GetGangDefinition", (gang: unknown) =>
  typeof gang === "string" ? (gangDefs.get(gang) ?? null) : null,
);
registerExport("GetAccountTypes", () => Object.fromEntries(accountTypes));
registerExport("GetUnemployedJob", () => settings.jobs.unemployed);

// Job and gang definitions of scripts (owned by the caller, gone when it stops): `jobs/runtime.ts`.
registerExport("RegisterJobDefinition", (name: unknown, def: unknown) =>
  runtimeJobs.register(name, def),
);
registerExport("RemoveJobDefinition", (name: unknown) =>
  runtimeJobs.remove(name),
);
registerExport("RegisterGangDefinition", (name: unknown, def: unknown) =>
  runtimeGangs.register(name, def),
);
registerExport("RemoveGangDefinition", (name: unknown) =>
  runtimeGangs.remove(name),
);
