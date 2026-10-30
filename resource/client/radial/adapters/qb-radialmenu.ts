import { callExport } from "@aicore-fivem/lib/client";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";

const RESOURCE = "qb-radialmenu";

/** qb-radialmenu has no conditions: the item always shows and a press runs only while `canShow` holds. */
const option = (item: RadialItem): Record<string, unknown> => ({
  id: item.id,
  title: item.label,
  icon: item.icon,
  type: "client",
  event: "",
  shouldClose: !item.keepOpen,
  action: () => {
    if (!item.canShow || item.canShow()) item.onPressed?.();
  },
  items: item.items?.map(option),
});

/** qb-radialmenu's `AddOption(data, id)` / `RemoveOption(id)` (no sub menu by parent: such items go to the main wheel; untested on ai-core). */
export const qbRadialmenu: RadialAdapter = {
  resource: RESOURCE,
  add: (item) => void callExport(RESOURCE, "AddOption", option(item), item.id),
  remove: (item) => void callExport(RESOURCE, "RemoveOption", item.id),
  refresh: () => undefined,
};
