import type {
  AdminPanelSnapshot,
  Recommendation,
  RecommendationDelta,
} from "@aicore-fivem/shared";
import { store } from "../../store";
import {
  recommendationChanged,
  recommendationsOpened,
} from "../../store/admin";
import { saveField } from "./actions";
import { getAt } from "./path";

/** ai-core's script recommendations: the open snapshot, the deltas, dismiss and the product page. */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function toRecommendation(value: unknown): Recommendation | null {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.desc !== "string" ||
    typeof value.url !== "string"
  )
    return null;
  return {
    id: value.id,
    title: value.title,
    desc: value.desc,
    url: value.url,
    free: value.free === true,
  };
}

/** The list in the panel's open message (`adminOpen` data). */
export function openRecommendations(open: unknown): void {
  const list =
    isObject(open) && Array.isArray(open.recommendations)
      ? open.recommendations
      : [];
  store.dispatch(
    recommendationsOpened(
      list.map(toRecommendation).filter((r): r is Recommendation => r !== null),
    ),
  );
}

/** `adminRecommendation` message: one recommendation starts (`value`) or stops (`null`) showing. */
export function onRecommendationDelta(data: unknown): void {
  if (!isObject(data) || typeof data.id !== "string") return;
  const value = data.value == null ? null : toRecommendation(data.value);
  if (data.value != null && !value) return;
  const delta: RecommendationDelta = { id: data.id, value };
  store.dispatch(recommendationChanged(delta));
}

/** ai-core settings `recommendations.dismissed` as the panel holds it (edits show here at once). */
export function dismissedIds(panels: AdminPanelSnapshot[]): string[] {
  const core = panels.find((p) => p.resource === "ai-core");
  const list = getAt(core?.data.settings, "recommendations.dismissed");
  return Array.isArray(list)
    ? list.filter((id): id is string => typeof id === "string")
    : [];
}

/** Saved like any settings edit; the server then drops it from the list. */
export function dismissRecommendation(id: string): void {
  const dismissed = dismissedIds(store.getState().admin.panels);
  if (dismissed.includes(id)) return;
  void saveField(
    "ai-core",
    "settings",
    undefined,
    "recommendations.dismissed",
    [...dismissed, id],
  );
}

/** In game the page opens in the player's browser (FiveM's `openUrl`); in the browser preview a new tab. */
export function openRecommendationPage(url: string): void {
  const native = (
    window as { invokeNative?: (name: string, value: string) => void }
  ).invokeNative;
  if (native) native("openUrl", url);
  else window.open(url, "_blank", "noopener");
}
