import { callExport } from "@aicore-fivem/lib/client";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";

const RESOURCE = "tgiann-radialmenu-target";

/** Its `RadialEntry`: same model under other names (`canInteract`, `onSelect`, `shouldClose`). */
const entry = (item: RadialItem): Record<string, unknown> => ({
  id: item.id,
  label: item.label,
  icon: item.icon,
  items: item.items?.map(entry),
  canInteract: item.canShow,
  onSelect: item.onPressed,
  shouldClose: !item.keepOpen,
  whileDead: item.whileDead,
});

/** tgiann-radialmenu-target's client exports `AddMenuItem(items, parentId)` / `RemoveMenuItem` / `RefreshMenu` (written from its source). */
export const tgiannRadialmenu: RadialAdapter = {
  resource: RESOURCE,
  add: (item) =>
    void callExport(RESOURCE, "AddMenuItem", entry(item), item.parent),
  remove: (item) =>
    void callExport(RESOURCE, "RemoveMenuItem", item.id, item.parent),
  refresh: () => void callExport(RESOURCE, "RefreshMenu"),
};
