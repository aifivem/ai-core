import { registerExport, triggerServerCallback } from "@aicore-fivem/lib/client";
import { isRecord, logSafe } from "@aicore-fivem/lib/shared";
import {
  ITEM_PICKER_CALLBACK,
  type ItemPickerData,
  type PickerItem,
} from "@aicore-fivem/shared";
import { Locale, ResourceName } from "common";
import { dialogs } from "./menu";

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function toData(value: unknown): ItemPickerData {
  const raw = isRecord(value) ? value : {};
  const items: PickerItem[] = Array.isArray(raw.items)
    ? raw.items.flatMap((v) =>
        isRecord(v) && typeof v.name === "string" && typeof v.label === "string"
          ? [
              {
                name: v.name,
                label: v.label,
                weight: finite(v.weight) ? v.weight : 0,
                image:
                  typeof v.image === "string" &&
                  /^(https?|nui):\/\//.test(v.image)
                    ? v.image
                    : undefined,
              },
            ]
          : [],
      )
    : [];
  const room =
    isRecord(raw.room) && finite(raw.room.weight) && finite(raw.room.maxWeight)
      ? { weight: raw.room.weight, maxWeight: raw.room.maxWeight }
      : null;
  return { items, room };
}

// The item picker of admin tools (lib `itemPicker`): the list comes from the server (admins only) on every open; the
// NUI answers once with the chosen list (`dialogAnswer`), or null when closed.
registerExport("OpenItemPicker", (id: unknown, request: unknown) => {
  if (typeof id !== "number" || !isRecord(request)) return;
  const resource = GetInvokingResource() || ResourceName;
  const title =
    typeof request.title === "string" ? logSafe(request.title, 60) : "";
  const target = typeof request.target === "number" ? request.target : null;
  void triggerServerCallback(ITEM_PICKER_CALLBACK, [target])
    .catch(() => null)
    .then((raw) =>
      dialogs.open(resource, id, {
        title,
        ...toData(raw),
        texts: {
          search: Locale("PICKER_SEARCH"),
          empty: Locale("PICKER_EMPTY"),
          hint: Locale("PICKER_HINT"),
          list: Locale("PICKER_LIST"),
          listEmpty: Locale("PICKER_LIST_EMPTY"),
          take: Locale("PICKER_TAKE"),
          weight: Locale("PICKER_WEIGHT"),
          heavy: Locale("PICKER_HEAVY"),
        },
      }),
    );
});
