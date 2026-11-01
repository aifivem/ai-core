import { spec } from "@aicore-fivem/lib/shared";
import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { bool, text } from "./specs";

/** Money account types: their records file (`data/accounts.json`; `accounts` = the types at start, never deleted) and tab. */

export const accountsFile = (accounts: string[]): FileSpec => ({
  kind: "records",
  sync: "admin",
  labelPath: "label",
  locked: accounts,
  newRecord: { start: 0, allowNegative: false },
  sections: {
    label: text(48),
    start: spec.int(0, 100_000_000),
    allowNegative: bool,
  },
});

export const accountsTab: TabSpec = {
  id: "accounts",
  file: "accounts",
  icon: "wallet",
  label: "ADMIN_TAB_ACCOUNTS",
  desc: "ADMIN_TAB_ACCOUNTS_DESC",
  createLabel: "ADMIN_NEW_ACCOUNT",
  deleteLabel: "ADMIN_DELETE_ACCOUNT",
  cards: [
    {
      icon: "wallet",
      title: "ADMIN_C_ACCOUNT",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_NAME",
          placeholder: "ADMIN_PH_ACCOUNT",
        },
        {
          widget: "number",
          path: "start",
          label: "ADMIN_F_START",
          hint: "ADMIN_H_START",
          min: 0,
          step: 100,
          unit: "$",
        },
        {
          widget: "switch",
          path: "allowNegative",
          label: "ADMIN_F_NEGATIVE",
          hint: "ADMIN_H_NEGATIVE",
        },
      ],
    },
  ],
};
