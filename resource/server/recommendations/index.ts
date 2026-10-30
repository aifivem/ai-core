import { isResourceStarted } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { Recommendation, RecommendationDelta } from "@aicore-fivem/shared";
import { Locale } from "common";
import { panel } from "../content";
import { log } from "../log";
import { phones } from "../phone";

type LangKey = Parameters<typeof Locale>[0];

/** A recommendation with the condition it shows under; `runs` = the resource is started and not stopping. */
interface Entry extends Recommendation {
  title: LangKey;
  desc: LangKey;
  shows: (runs: (resource: string) => boolean) => boolean;
}

/** Scripts ai-core recommends; a new one = one entry here plus its two lang keys in `locales/en.json`. */
const RECOMMENDATIONS: readonly Entry[] = [
  {
    id: "tgiann-phone",
    title: "ADMIN_REC_TGIANN_PHONE",
    desc: "ADMIN_REC_TGIANN_PHONE_DESC",
    url: "https://www.tgiann.com/package/fivem-phone",
    free: true,
    shows: () => phones.active === null,
  },
  {
    id: "tgiann-esc-map",
    title: "ADMIN_REC_TGIANN_ESC_MAP",
    desc: "ADMIN_REC_TGIANN_ESC_MAP_DESC",
    url: "https://www.tgiann.com/package/fivem-custom-esc-map-blip-system",
    free: true,
    shows: (runs) => !runs("tgiann-esc-map"),
  },
];

/** ai-core settings `recommendations.dismissed`: the ids the owner dismissed. */
function readDismissed(settings: unknown): Set<string> {
  const section = isRecord(settings) ? settings.recommendations : null;
  const list = isRecord(section) ? section.dismissed : null;
  return new Set(
    Array.isArray(list)
      ? list.filter((id): id is string => typeof id === "string")
      : [],
  );
}

/**
 * The script recommendations on the admin dashboard and in the console: each shows while its condition holds and the
 * owner has not dismissed it. Re-checked when a resource starts or stops, the phone layer switches or the settings
 * change; admins with the panel open get each change as a delta.
 */
class Recommendations {
  private readonly shown = new Map<string, Omit<Entry, "shows">>();
  /** Resources whose stop event ran: they still read started while they stop. */
  private readonly down = new Set<string>();
  private readonly listeners: Array<(delta: RecommendationDelta) => void> = [];

  list(): Recommendation[] {
    return [...this.shown.values()];
  }

  onChange(listener: (delta: RecommendationDelta) => void): void {
    this.listeners.push(listener);
  }

  started(resource: string): void {
    this.down.delete(resource);
    this.refresh();
  }

  stopped(resource: string): void {
    this.down.add(resource);
    this.refresh();
  }

  refresh(): void {
    const dismissed = readDismissed(panel.get("settings"));
    const runs = (resource: string) =>
      !this.down.has(resource) && isResourceStarted(resource);
    for (const { shows, ...recommendation } of RECOMMENDATIONS) {
      const show = !dismissed.has(recommendation.id) && shows(runs);
      if (show === this.shown.has(recommendation.id)) continue;
      if (show) this.shown.set(recommendation.id, recommendation);
      else this.shown.delete(recommendation.id);
      const delta = {
        id: recommendation.id,
        value: show ? recommendation : null,
      };
      for (const listener of this.listeners) listener(delta);
    }
  }

  /** One console line per recommendation that shows. */
  print(): void {
    for (const { title, desc, url } of this.shown.values())
      log.info(Locale("ADMIN_REC_CONSOLE", Locale(title), Locale(desc), url));
  }
}

export const recommendations = new Recommendations();
recommendations.refresh();
on("onServerResourceStart", (resource: string) =>
  recommendations.started(resource),
);
on("onResourceStop", (resource: string) => recommendations.stopped(resource));
phones.onSwitch(() => recommendations.refresh());
panel.onChange("settings", () => recommendations.refresh());
// Once at start, after the resources listed after ai-core in server.cfg have started.
setTimeout(() => recommendations.print(), 15_000);
