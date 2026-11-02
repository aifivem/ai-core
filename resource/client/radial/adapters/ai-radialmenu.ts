import { resourceExport } from "@aifivem/lib/client";
import type { RadialAdapter } from "@aifivem/shared";

const wheel = resourceExport("ai-radialmenu");

/** ai-radialmenu takes the item model as it is. */
export const aiRadialmenu: RadialAdapter = {
  resource: "ai-radialmenu",
  add: (item) => wheel.AddItem(item),
  remove: (item) => wheel.RemoveItem(item.id, item.parent),
  refresh: () => wheel.Refresh(),
};
