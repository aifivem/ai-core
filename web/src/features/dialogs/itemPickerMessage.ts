import type { ItemPickerData } from "@aicore-fivem/shared";

/** The item picker's open message (`itemsOpen`): the inventory's items, the target's room and the texts. */
export interface ItemPickerMessage extends ItemPickerData {
  title: string;
  texts: {
    search: string;
    empty: string;
    hint: string;
    list: string;
    listEmpty: string;
    take: string;
    weight: string;
    heavy: string;
  };
}
