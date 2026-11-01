import { isResourceStarted, registerExport } from "@aicore-fivem/lib/server";
import { jobs as jobDefs, panel, settings } from "../../content";
import type { PrimeHours } from "../../content/primeTime";
import { log } from "../../log";
import type { PrimeTimeAdapter } from "./adapter";
import { PRIME_TIME_SYSTEMS } from "./registry";

/** `start > finish` wraps past midnight; `start === finish` is the whole day. */
export function inPrimeHours(
  hour: number,
  { start, finish }: PrimeHours,
): boolean {
  if (start === finish) return true;
  return start < finish
    ? hour >= start && hour < finish
    : hour >= start || hour < finish;
}

/**
 * Prime time per job, from the source the panel picks (`settings.primeTime.source`): `auto` = the first running script
 * of `PRIME_TIME_SYSTEMS`, else ai-core's own hours (a job's own window or the default); a picked script that is
 * stopped makes every hour prime time (full salary). Server local time. The active source is written into the settings
 * (`primeTimeActive`: `ai-core`, a resource name or `none`) for the panel's read-only row.
 */
class PrimeTime {
  private readonly up = new Set(
    PRIME_TIME_SYSTEMS.filter((a) => isResourceStarted(a.resource)).map(
      (a) => a.resource,
    ),
  );
  private readonly warned = new Set<string>();

  constructor() {
    const names = new Set(PRIME_TIME_SYSTEMS.map((a) => a.resource));
    on("onServerResourceStart", (resource: string) => {
      if (!names.has(resource)) return;
      this.up.add(resource);
      this.publish();
    });
    // A stopping resource still reads "started": count it as stopped from here.
    on("onResourceStop", (resource: string) => {
      if (!this.up.delete(resource)) return;
      this.publish();
    });
    panel.onChange("settings", () => this.publish());
    // After the resource's exports exist: a commit tells open panels through ai-core's own export.
    setImmediate(() => this.publish());
  }

  /** The adapter answering now, "ai-core" for ai-core's hours, "none" for a picked script that is stopped. */
  private source(): PrimeTimeAdapter | "ai-core" | "none" {
    const choice = settings.primeTime.source;
    if (choice === "ai-core") return "ai-core";
    if (choice === "auto")
      return (
        PRIME_TIME_SYSTEMS.find((a) => this.up.has(a.resource)) ?? "ai-core"
      );
    const picked = PRIME_TIME_SYSTEMS.find((a) => a.resource === choice);
    return picked && this.up.has(picked.resource) ? picked : "none";
  }

  /** Whether it is prime time for `job` (the default hours without one). */
  isPrimeTime(job?: string): boolean {
    const source = this.source();
    if (source === "none") return true;
    if (source !== "ai-core") {
      try {
        return source.isPrimeTime(job);
      } catch (error) {
        log.error(
          `${source.resource} IsPrimeTime failed, using ai-core's hours`,
          error,
        );
      }
    }
    const hours = (job && jobDefs.get(job)?.prime) || settings.primeTime;
    return inPrimeHours(new Date().getHours(), hours);
  }

  /** Writes the active source into the settings for the panel, only when it changed. */
  private publish(): void {
    const source = this.source();
    const active = typeof source === "string" ? source : source.resource;
    if (typeof source !== "string") this.checkVersion(source);
    const current = panel.get("settings");
    if (current.primeTimeActive === active) return;
    panel.commit("settings", undefined, {
      ...current,
      primeTimeActive: active,
    });
    log.info(`prime time hours from: ${active}`);
  }

  private checkVersion(adapter: PrimeTimeAdapter): void {
    const installed = GetResourceMetadata(adapter.resource, "version", 0);
    if (!adapter.version || installed === adapter.version) return;
    if (this.warned.has(adapter.resource)) return;
    this.warned.add(adapter.resource);
    log.warn(
      `prime time: ${adapter.resource} ${installed} runs, the adapter is written for ${adapter.version}`,
    );
  }
}

export const primeTime = new PrimeTime();

registerExport("IsPrimeTime", (job?: unknown) =>
  primeTime.isPrimeTime(typeof job === "string" && job ? job : undefined),
);
