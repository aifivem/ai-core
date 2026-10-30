import { callExport } from "@aicore-fivem/lib/client";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";

const RESOURCE = "ox_lib";
/** Sub menus this adapter registered (ox_lib only adds into a menu registered with `registerRadial`). */
const menus = new Set<string>();
const menuId = (id: string) => `ai-core:${id}`;

/** ox_lib's `RadialMenuItem`; sub items become a registered radial menu. No conditions: a press checks `canShow`. */
function oxItem(item: RadialItem): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: item.id,
    label: item.label,
    icon: item.icon ?? "circle",
    keepOpen: item.keepOpen,
  };
  if (item.items?.length) {
    out.menu = menuId(item.id);
    menus.add(menuId(item.id));
    callExport(RESOURCE, "registerRadial", {
      id: menuId(item.id),
      items: item.items.map(oxItem),
    });
  } else
    out.onSelect = () => {
      if (!item.canShow || item.canShow()) item.onPressed?.();
    };
  return out;
}

const parentOf = (item: RadialItem) =>
  item.parent && menus.has(menuId(item.parent))
    ? menuId(item.parent)
    : undefined;

/** ox_lib's radial (`addRadialItem(item, parentMenuId)`, `removeRadialItem(id, parentMenuId)`); untested on ai-core. */
export const oxLibRadial: RadialAdapter = {
  resource: RESOURCE,
  add: (item) =>
    void callExport(RESOURCE, "addRadialItem", oxItem(item), parentOf(item)),
  remove: (item) =>
    void callExport(RESOURCE, "removeRadialItem", item.id, parentOf(item)),
  refresh: () => undefined,
};
