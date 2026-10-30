import { AdminWorld, registerExport } from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

/**
 * Job and gang definitions on this client (panel files `jobs` / `gangs`, `sync: "all"`): the cached files, then
 * the changes since start, then live changes. The bridge reads them once and follows the local event.
 */
const FILES = ["jobs", "gangs"] as const;
const world = new AdminWorld([...FILES]);

for (const file of FILES)
  world.onChange(file, (key, value) => {
    if (key !== undefined) emit(CORE.clientDefinitionsEvent, file, key, value);
  });

registerExport("GetDefinitions", (file: unknown) =>
  file === "jobs" || file === "gangs" ? world.get(file) : null,
);
