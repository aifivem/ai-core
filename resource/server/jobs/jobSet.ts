import { sendPlayerData, WriteQueue } from "@aicore-fivem/lib/server";
import { CORE, type JobMembership } from "@aicore-fivem/shared";
import { jobs as jobDefs, settings } from "../content";
import { log } from "../log";
import { changeDutyCount } from "./dutyCount";
import { addMembership, removeMembership } from "./principals";
import { deleteJob, saveJob } from "./repo";

export type JobChange = { ok: true } | { ok: false; error: "UNKNOWN_JOB" | "INVALID_GRADE" | "LIMIT" | "NOT_MEMBER" };

/**
 * A loaded character's jobs (multi-job, owner decision): any number up to `maxJobs` when multi-job is on, exactly
 * one when it is off (a new job replaces the old). At most one job is on duty; salary comes from that one only.
 * The unemployed job is never stored: a character without jobs is unemployed.
 */
export class JobSet {
  private duty: string | null = null;

  constructor(
    private readonly source: number,
    private readonly charId: number,
    private readonly list: JobMembership[],
    private readonly writes: WriteQueue,
    /** The job the character was last on duty in (kept in metadata by the player). */
    private lastDuty: string | null,
  ) {
    for (const m of list) addMembership(source, "job", m.job, m.grade);
  }

  all(): JobMembership[] {
    return this.list.map((m) => ({ ...m }));
  }

  grade(job: string): number | null {
    return this.list.find((m) => m.job === job)?.grade ?? null;
  }

  onDuty(): string | null {
    return this.duty;
  }

  last(): string | null {
    return this.lastDuty;
  }

  /** The job other scripts see as "the" job: on duty, else last on duty, else the first, else unemployed. */
  current(): JobMembership {
    const pick = this.duty ?? this.lastDuty;
    return this.list.find((m) => m.job === pick) ?? this.list[0] ?? { job: settings.jobs.unemployed, grade: 0 };
  }

  set(job: string, grade: number): JobChange {
    const def = jobDefs.get(job);
    if (!def) return { ok: false, error: "UNKNOWN_JOB" };
    if (!Number.isInteger(grade) || grade < 0 || grade >= def.grades.length) return { ok: false, error: "INVALID_GRADE" };
    const existing = this.list.find((m) => m.job === job);
    if (existing) {
      removeMembership(this.source, "job", job, existing.grade);
      existing.grade = grade;
    } else {
      if (!settings.jobs.multiJob) for (const other of this.list.map((m) => m.job)) this.remove(other);
      else if (this.list.length >= settings.jobs.maxJobs) return { ok: false, error: "LIMIT" };
      this.list.push({ job, grade });
    }
    addMembership(this.source, "job", job, grade);
    this.writes.push(`job ${this.charId} ${job}`, () => saveJob(this.charId, job, grade));
    this.pushJobs();
    return { ok: true };
  }

  remove(job: string): JobChange {
    const index = this.list.findIndex((m) => m.job === job);
    const member = this.list[index];
    if (!member) return { ok: false, error: "NOT_MEMBER" };
    if (this.duty === job) this.setDuty(null);
    if (this.lastDuty === job) this.lastDuty = null;
    this.list.splice(index, 1);
    removeMembership(this.source, "job", job, member.grade);
    this.writes.push(`job ${this.charId} -${job}`, () => deleteJob(this.charId, job));
    this.pushJobs();
    return { ok: true };
  }

  /** Goes on duty in `job` (off in any other), or off duty with null. */
  setDuty(job: string | null): JobChange {
    if (job !== null && !this.list.some((m) => m.job === job)) return { ok: false, error: "NOT_MEMBER" };
    if (job === this.duty) return { ok: true };
    if (this.duty) changeDutyCount(this.duty, -1);
    this.duty = job;
    if (job) {
      changeDutyCount(job, 1);
      this.lastDuty = job;
    }
    sendPlayerData(this.source, "duty", job);
    emit(CORE.dutyChangedEvent, this.source, job);
    return { ok: true };
  }

  /** Drops the character's runtime traces (duty count, principals) when it unloads. */
  release(): void {
    if (this.duty) changeDutyCount(this.duty, -1);
    this.duty = null;
    for (const m of this.list) removeMembership(this.source, "job", m.job, m.grade);
  }

  private pushJobs(): void {
    const list = this.all();
    sendPlayerData(this.source, "jobs", list);
    emit(CORE.jobsChangedEvent, this.source, list);
  }
}

export function logWriteError(label: string, error: unknown): void {
  log.error(`membership write failed (${label})`, error);
}
