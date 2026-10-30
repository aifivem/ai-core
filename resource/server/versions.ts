import { every, registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { UpdateInfo } from "@aicore-fivem/shared";
import { panel, settings } from "./content";
import { log } from "./log";

/** One GitHub request per script at most this often; the answer is kept in KVP across restarts. */
const CHECK_EVERY_MS = 6 * 60 * 60_000;
/** Resources better known by another name. */
const LABELS: Record<string, string> = { monitor: "txAdmin" };
const GITHUB = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

interface Checked {
  at: number;
  latest: string | null;
  url: string;
}

/** Numeric dotted version compare: >0 when `a` is newer. Pre-release suffixes are ignored. */
function compare(a: string, b: string): number {
  const pa = a
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = b
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const gameThread = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Compares every started script that has a GitHub `repository` line (fxmanifest, written from package.json) with its
 * latest release: outdated ones are warned in the console and listed on the admin dashboard. The owner turns it off
 * or leaves scripts out in the panel (General, Updates).
 */
class VersionCheck {
  private readonly outdated = new Map<string, UpdateInfo>();
  private readonly running = new Set<string>();

  list(): UpdateInfo[] {
    return [...this.outdated.values()].filter((u) => this.wanted(u.resource));
  }

  private wanted(resource: string): boolean {
    return (
      settings.updates.check && !settings.updates.ignore.includes(resource)
    );
  }

  checkAll(): void {
    for (let i = 0; i < GetNumResources(); i++) {
      const resource = GetResourceByFindIndex(i);
      if (resource && GetResourceState(resource) === "started")
        void this.check(resource);
    }
  }

  async check(resource: string): Promise<void> {
    if (!this.wanted(resource) || this.running.has(resource)) return;
    const repo = GITHUB.exec(
      GetResourceMetadata(resource, "repository", 0) ?? "",
    );
    const current = GetResourceMetadata(resource, "version", 0);
    if (!repo || !current) return;
    this.running.add(resource);
    try {
      const known = this.cached(resource);
      const result =
        known && Date.now() - known.at < CHECK_EVERY_MS
          ? known
          : await this.ask(resource, repo[1] ?? "", repo[2] ?? "");
      if (!result) return;
      this.apply(resource, current, result);
    } finally {
      this.running.delete(resource);
    }
  }

  private cached(resource: string): Checked | null {
    try {
      const raw: unknown = JSON.parse(
        GetResourceKvpString(`update:${resource}`) || "null",
      );
      return isRecord(raw) &&
        typeof raw.at === "number" &&
        typeof raw.url === "string"
        ? {
            at: raw.at,
            latest: typeof raw.latest === "string" ? raw.latest : null,
            url: raw.url,
          }
        : null;
    } catch {
      return null;
    }
  }

  private async ask(
    resource: string,
    owner: string,
    name: string,
  ): Promise<Checked | null> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${name}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-core-update-check",
        },
      },
    ).catch(() => null);
    await gameThread();
    if (!response) return null;
    // 404: no release yet (or no such repository): nothing to compare, asked again later.
    if (response.status === 404)
      return this.store(resource, {
        at: Date.now(),
        latest: null,
        url: `https://github.com/${owner}/${name}`,
      });
    if (!response.ok) return null;
    const body: unknown = await response.json().catch(() => null);
    await gameThread();
    if (!isRecord(body) || typeof body.tag_name !== "string") return null;
    return this.store(resource, {
      at: Date.now(),
      latest: body.tag_name.replace(/^v/i, ""),
      url:
        typeof body.html_url === "string"
          ? body.html_url
          : `https://github.com/${owner}/${name}/releases`,
    });
  }

  private store(resource: string, result: Checked): Checked {
    SetResourceKvp(`update:${resource}`, JSON.stringify(result));
    return result;
  }

  private apply(resource: string, current: string, result: Checked): void {
    const before = this.outdated.get(resource);
    if (!result.latest || compare(result.latest, current) <= 0) {
      this.outdated.delete(resource);
      return;
    }
    const label = LABELS[resource] ?? resource;
    this.outdated.set(resource, {
      resource,
      label,
      current,
      latest: result.latest,
      url: result.url,
    });
    if (before?.latest !== result.latest)
      log.warn(
        `${label} ${current} is outdated: ${result.latest} is out (${result.url})`,
      );
  }
}

export const versions = new VersionCheck();
setTimeout(() => versions.checkAll(), 15_000);
every(CHECK_EVERY_MS, () => versions.checkAll(), { name: "versions" });
on("onServerResourceStart", (resource: string) =>
  setTimeout(() => void versions.check(resource), 5_000),
);
panel.onChange("settings", () => versions.checkAll());
registerExport("GetUpdates", () => versions.list());
