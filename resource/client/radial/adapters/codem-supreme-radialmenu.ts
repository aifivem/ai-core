import { callExport } from "@aicore-fivem/lib/client";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";

const RESOURCE = "codem-supreme-radialmenu";
/** The current item of each leaf id; a press arrives as the local event `ai-core:radial:<id>`. */
const leaves = new Map<string, RadialItem>();
const listening = new Set<string>();
const eventOf = (id: string) => `ai-core:radial:${id}`;

/** Its actions are client events (no function field): each leaf gets its own local event, listened to once per id. */
function listen(item: RadialItem): void {
  leaves.set(item.id, item);
  if (listening.has(item.id)) return;
  listening.add(item.id);
  on(eventOf(item.id), () => {
    const current = leaves.get(item.id);
    if (current && (!current.canShow || current.canShow()))
      current.onPressed?.();
  });
}

/** Its menu item: `canOpen` shows it, `event` + `type: "client"` runs it, `items` opens a sub menu. */
function entry(item: RadialItem): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: item.id,
    label: item.label,
    icon: item.icon,
    canOpen: item.canShow,
    shouldClose: !item.keepOpen,
  };
  if (item.items?.length) out.items = item.items.map(entry);
  else {
    listen(item);
    out.event = eventOf(item.id);
    out.type = "client";
  }
  return out;
}

function forget(item: RadialItem): void {
  leaves.delete(item.id);
  item.items?.forEach(forget);
}

/**
 * Codem Supreme Radial Menu client exports `AddMenuItem(item)` / `RemoveMenuItem(id)` (written from its docs). No
 * parent argument (an item with a `parent` goes to the main wheel), no `whileDead`; nothing to refresh.
 */
export const codemSupremeRadialmenu: RadialAdapter = {
  resource: RESOURCE,
  add: (item) => void callExport(RESOURCE, "AddMenuItem", entry(item)),
  remove: (item) => {
    forget(item);
    callExport(RESOURCE, "RemoveMenuItem", item.id);
  },
  refresh: () => undefined,
};
