import { registerExport } from "@aicore-fivem/lib/server";
import { inventory } from "./active";
import { name, products, ref } from "./args";

/** Stash, open-inventory and shop exports: kept by ai-core and handed to every inventory that becomes active. */

registerExport(
  "RegisterStash",
  (
    id: unknown,
    label: unknown,
    slots: unknown,
    maxWeight: unknown,
    jobs?: unknown,
  ) => {
    const n = name(id);
    if (n === null) return;
    inventory.registerStash({
      name: n,
      label: typeof label === "string" ? label : n,
      slots: typeof slots === "number" && slots > 0 ? Math.floor(slots) : 50,
      maxWeight:
        typeof maxWeight === "number" && maxWeight > 0 ? maxWeight : 100_000,
      jobs: Array.isArray(jobs)
        ? jobs.filter((j): j is string => typeof j === "string")
        : [],
    });
  },
);
registerExport("OpenInventory", (source: unknown, inv: unknown) => {
  const r = ref(inv);
  return (
    typeof source === "number" &&
    r !== null &&
    inventory.call("OpenInventory", (a) => a.openInventory(source, r), false)
  );
});
registerExport(
  "RegisterShop",
  (id: unknown, label: unknown, items: unknown) => {
    const n = name(id);
    const list = products(items);
    if (n === null || list.length === 0) return;
    inventory.registerShop({
      name: n,
      label: typeof label === "string" && label !== "" ? label : n,
      items: list,
    });
  },
);
registerExport("OpenShop", (source: unknown, shop: unknown) => {
  const n = name(shop);
  return typeof source === "number" && n !== null
    ? inventory.openShop(source, n)
    : false;
});
