import { callExport } from "@aicore-fivem/lib/client";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";

const RESOURCE = "tgiann-radialmenu";

/** Its `RadialMenuItem`: same model under other names (`canInteract`, `onSelect`, `shouldClose`); no `whileDead`. */
const entry = (item: RadialItem): Record<string, unknown> => ({
  id: item.id,
  label: item.label,
  icon: item.icon,
  items: item.items?.map(entry),
  canInteract: item.canShow,
  onSelect: item.onPressed,
  shouldClose: !item.keepOpen,
});

/**
 * tgiann-radialmenu (the non-target one) client exports `AddMenuItem(item)` / `RemoveMenuItem(id)` (written from its
 * source, 1.0.0). It builds the wheel each time it opens, so nothing to refresh; it has no parent argument: an item
 * with a `parent` goes to the main wheel.
 */
export const tgiannRadialmenuStandalone: RadialAdapter = {
  resource: RESOURCE,
  add: (item) => void callExport(RESOURCE, "AddMenuItem", entry(item)),
  remove: (item) => void callExport(RESOURCE, "RemoveMenuItem", item.id),
  refresh: () => undefined,
};
