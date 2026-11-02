import {
  AdminWorld,
  callAction,
  GlobalKey,
  input,
  menu,
  Points,
  stateString,
} from "@aifivem/lib/client";
import { groupDigits, readFinite, RecordObjects } from "@aifivem/lib/shared";
import { CORE } from "@aifivem/shared";
import { Locale } from "common";
import { PAYCHECK_OFFICE, readPaycheckOffice } from "common/paycheckOffice";

/** Paycheck office points (panel `paycheckOffices`), built only while the paycheck mode is "office". */
const world = new AdminWorld([PAYCHECK_OFFICE.file]);
const points = new Points();

/** The panel's `paycheck.mode`, replicated by the server. */
const mode = new GlobalKey(CORE.paycheckModeStateKey, stateString);
const officeMode = () => mode.get() === "office";

/** Takes `amount` (null = everything) of the waiting salary; the server notifies the paid amount. */
async function withdraw(office: string, amount: number | null): Promise<void> {
  await callAction(PAYCHECK_OFFICE.withdrawCallback, [office, amount], {
    fallback: "PAYCHECK_ERR_FAILED",
  });
}

/** The office menu: the waiting salary (one snapshot when it opens), take all or an amount. */
async function openOffice(office: string): Promise<void> {
  const reply = await callAction(PAYCHECK_OFFICE.balanceCallback, [office], {
    fallback: "PAYCHECK_ERR_FAR",
  });
  const balance = readFinite(reply?.balance);
  if (balance === null) return;
  const empty = balance <= 0;
  const picked = await menu({
    title: Locale("PAYCHECK_TITLE"),
    items: [
      {
        id: "balance",
        label: Locale("PAYCHECK_WAITING", groupDigits(balance)),
        icon: "wallet",
        disabled: true,
      },
      {
        id: "all",
        label: Locale("PAYCHECK_ALL"),
        icon: "money-bill-wave",
        disabled: empty,
      },
      {
        id: "amount",
        label: Locale("PAYCHECK_SOME"),
        icon: "keyboard",
        disabled: empty,
      },
    ],
  });
  if (picked === "all") return withdraw(office, null);
  if (picked !== "amount") return;
  const values = await input({
    title: Locale("PAYCHECK_TITLE"),
    fields: [
      {
        name: "amount",
        label: Locale("PAYCHECK_AMOUNT"),
        type: "number",
        min: 1,
        max: balance,
        placeholder: groupDigits(balance),
      },
    ],
    confirm: Locale("PAYCHECK_CONFIRM"),
  });
  const amount = Math.floor(Number(values?.amount));
  if (Number.isFinite(amount) && amount > 0) await withdraw(office, amount);
}

const objects = new RecordObjects(
  world,
  PAYCHECK_OFFICE.file,
  readPaycheckOffice,
  (id, office) => {
    if (!officeMode()) return;
    points.add(`office:${id}`, {
      ped: office.ped ?? undefined,
      coords: { x: office.x, y: office.y, z: office.z },
      label: Locale("PAYCHECK_PROMPT"),
      icon: "money-bill-wave",
      radius: office.radius,
      blip: office.blip
        ? { ...office.blipStyle, label: office.label }
        : undefined,
      onPressed: () => openOffice(id),
    });
    return () => points.remove(`office:${id}`);
  },
);

/** A mode change builds or removes every office; office edits rebuild only their own point. */
let shown = officeMode();
mode.onChange(() => {
  if (officeMode() === shown) return;
  shown = officeMode();
  objects.rebuildAll();
});
