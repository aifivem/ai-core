import { LIB_UI } from "@aicore-fivem/shared";

/**
 * Where ai-lib's notification cards can go (panel setting `notify`): ai-lib's own cards first (the default), then
 * other notification UIs (client adapters in `client/notify.ts`, same names). A new one = a line here and an adapter
 * there.
 */
export const NOTIFY_SYSTEMS: ReadonlyArray<{ resource: string }> = [
  { resource: LIB_UI.resource },
  { resource: "tgiann-lumihud" },
  { resource: "okokNotify" },
  { resource: "ox_lib" },
  { resource: "mythic_notify" },
  { resource: "brutal_notify" },
];
