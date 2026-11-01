import {
  AdminWorld,
  GlobalGroup,
  registerExport,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";

/**
 * Job and gang definitions on this client (panel files `jobs` / `gangs`, `sync: "all"`): the cached files, then
 * the changes since start, then live changes. Definitions scripts register at runtime come as per-name GlobalState
 * (`CORE.runtimeJobPrefix` / `runtimeGangPrefix`); a panel record of the same name wins. The bridge reads them once
 * and follows the local event.
 */
const FILES = ["jobs", "gangs"] as const;
type File = (typeof FILES)[number];
const world = new AdminWorld([...FILES]);
const parse = (v: unknown): Record<string, unknown> | undefined =>
  isRecord(v) ? v : undefined;
const runtime: Record<File, GlobalGroup<Record<string, unknown>>> = {
  jobs: new GlobalGroup(CORE.runtimeJobPrefix, parse),
  gangs: new GlobalGroup(CORE.runtimeGangPrefix, parse),
};

const panelRecord = (file: File, key: string): unknown => {
  const records = world.get(file);
  return isRecord(records) ? records[key] : undefined;
};

for (const file of FILES) {
  world.onChange(file, (key, value) => {
    if (key === undefined) return;
    // A panel record removed: a script's definition of that name shows again.
    emit(
      CORE.clientDefinitionsEvent,
      file,
      key,
      value ?? runtime[file].get(key) ?? null,
    );
  });
  runtime[file].onChange((key, value) => {
    if (panelRecord(file, key) !== undefined) return;
    emit(CORE.clientDefinitionsEvent, file, key, value ?? null);
  });
}

registerExport("GetDefinitions", (file: unknown) => {
  if (file !== "jobs" && file !== "gangs") return null;
  const records = world.get(file);
  const group = runtime[file];
  let merged: Record<string, unknown> | null = null;
  for (const key of group.ids()) {
    const def = group.get(key);
    if (def === undefined) continue;
    merged ??= {};
    merged[key] = def;
  }
  return merged
    ? { ...merged, ...(isRecord(records) ? records : {}) }
    : records;
});
