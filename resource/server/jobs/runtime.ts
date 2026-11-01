import { ByResource, caller, GlobalGroup } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { CORE, type CharacterResult } from "@aicore-fivem/shared";
import {
  gangs,
  jobs,
  panel,
  readGang,
  readJob,
  type GangDef,
  type JobDef,
} from "../content";
import { ID_PATTERN } from "../content/parse";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { dutyCount, resetDutyCounts } from "./dutyCount";

/**
 * Job and gang definitions a script registers at runtime (`RegisterJobDefinition`): owned by the calling resource,
 * never written to `data/*.json`, gone when that resource stops. They live in the same maps as the panel's, so every
 * reader (sets, paycheck, `GetJobDefinition(s)`, the bridge) sees them; clients get them from per-name GlobalState
 * (`CORE.runtimeJobPrefix`), which `client/definitions.ts` merges under the panel files. A panel record of the same
 * name wins: registering is refused, and a panel record created later takes the name over. Members of a removed
 * definition keep the membership (the same as a job deleted in the panel).
 */
class RuntimeDefinitions<T> {
  private readonly owned: ByResource<string, T>;
  private readonly published: GlobalGroup<Record<string, unknown>>;

  private readonly file: "jobs" | "gangs";

  constructor(
    private readonly kind: "job" | "gang",
    private readonly target: Map<string, T>,
    private readonly read: (raw: Record<string, unknown>) => T,
    private readonly view: (def: T) => Record<string, unknown>,
    prefix: string,
  ) {
    this.file = kind === "job" ? "jobs" : "gangs";
    this.published = new GlobalGroup(prefix, (v) =>
      isRecord(v) ? v : undefined,
    );
    // GlobalState outlives a restart of ai-core: names left by the last run go.
    for (const name of this.published.ids())
      this.published.set(name, undefined);
    this.owned = new ByResource({
      onDrop: (resource, name, def) => {
        if (this.target.get(name) !== def) return;
        this.target.delete(name);
        this.published.set(name, undefined);
        emit(CORE.definitionsChangedEvent, this.file, name);
        log.info(`${this.file} ${name} of ${resource} removed (stopped)`);
      },
    });
    // A panel record created with a registered name takes it over (the panel's maps were updated first).
    panel.onChange(this.file, (key, value) => {
      if (key === undefined || value === null || !this.owned.get(key)) return;
      this.owned.delete(key);
      this.published.set(key, undefined);
    });
  }

  register(name: unknown, definition: unknown): CharacterResult {
    const owner = caller();
    if (
      typeof name !== "string" ||
      !ID_PATTERN.test(name) ||
      !isRecord(definition)
    )
      return { ok: false, error: "CORE_ERR_ARGS" };
    const mine = this.owned.get(name);
    if (this.target.has(name) && mine === undefined)
      return { ok: false, error: "CORE_ERR_DEFINITION_PANEL" };
    if (mine !== undefined && this.owned.ownerOf(name) !== owner)
      return { ok: false, error: "CORE_ERR_DEFINITION_OWNER" };
    const def = this.read(definition);
    this.owned.set(name, def, owner);
    this.target.set(name, def);
    this.published.set(name, this.view(def));
    emit(CORE.definitionsChangedEvent, this.file, name);
    this.prepare(name);
    return { ok: true };
  }

  remove(name: unknown): boolean {
    if (typeof name !== "string") return false;
    const def = this.owned.get(name);
    if (def === undefined || this.owned.ownerOf(name) !== caller())
      return false;
    this.owned.delete(name);
    if (this.target.get(name) === def) this.target.delete(name);
    this.published.set(name, undefined);
    emit(CORE.definitionsChangedEvent, this.file, name);
    return true;
  }

  /** A registered job or gang gets its shared accounts and duty count like a panel one. */
  private prepare(name: string): void {
    if (this.kind === "job" && dutyCount(name) === 0) resetDutyCounts([name]);
    sharedAccounts
      .load(this.kind, name)
      .catch((error: unknown) =>
        log.error(`loading the accounts of ${this.kind} ${name} failed`, error),
      );
  }
}

/** What clients get: the panel file's shape without server-only prime hours. */
const jobView = (def: JobDef): Record<string, unknown> => ({
  label: def.label,
  type: def.type,
  defaultDuty: def.defaultDuty,
  listed: def.listed,
  grades: def.grades,
});
const gangView = (def: GangDef): Record<string, unknown> => ({
  label: def.label,
  grades: def.grades,
});

export const runtimeJobs = new RuntimeDefinitions<JobDef>(
  "job",
  jobs,
  readJob,
  jobView,
  CORE.runtimeJobPrefix,
);
export const runtimeGangs = new RuntimeDefinitions<GangDef>(
  "gang",
  gangs,
  readGang,
  gangView,
  CORE.runtimeGangPrefix,
);
