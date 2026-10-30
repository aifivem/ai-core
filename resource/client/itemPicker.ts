import { registerExport, triggerServerCallback } from "@aicore-fivem/lib/client";
import { isRecord, logSafe } from "@aicore-fivem/lib/shared";
import { ITEM_PICKER_CALLBACK, type PickerItem } from "@aicore-fivem/shared";
import { Locale, ResourceName } from "common";
import { NuiCallback } from "common/nui";
import { dialogs } from "./menu";

function toItems(value: unknown): PickerItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) =>
    isRecord(v) && typeof v.name === "string" && typeof v.label === "string"
      ? [
          {
            name: v.name,
            label: v.label,
            image:
              typeof v.image === "string" &&
              /^(https?|nui):\/\//.test(v.image)
                ? v.image
                : undefined,
          },
        ]
      : [],
  );
}

// The item picker of admin tools (lib `itemPicker`): the list comes from the server (admins only) on every open.
registerExport("OpenItemPicker", (id: unknown, request: unknown) => {
  if (typeof id !== "number" || !isRecord(request)) return;
  const resource = GetInvokingResource() || ResourceName;
  const title =
    typeof request.title === "string" ? logSafe(request.title, 60) : "";
  void triggerServerCallback(ITEM_PICKER_CALLBACK)
    .catch(() => null)
    .then((list) =>
      dialogs.open("items", resource, id, {
        title,
        items: toItems(list),
        texts: {
          search: Locale("PICKER_SEARCH"),
          count: Locale("PICKER_COUNT"),
          empty: Locale("PICKER_EMPTY"),
          hint: Locale("PICKER_HINT"),
        },
      }),
    );
});

RegisterNuiCallback(
  NuiCallback.dialogPickItem,
  (data: unknown, cb: (r: unknown) => void) => {
    if (
      isRecord(data) &&
      typeof data.name === "string" &&
      typeof data.count === "number" &&
      Number.isInteger(data.count) &&
      data.count > 0
    )
      dialogs.pick(data.name, Math.min(data.count, 10_000));
    cb(true);
  },
);
