import { controls, registerExport } from "@aicore-fivem/lib/client";
import { isRecord, logSafe } from "@aicore-fivem/lib/shared";
import {
  MENU_EVENTS,
  type InputField,
  type InputRequest,
  type MenuItem,
  type MenuRequest,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { NuiCallback, NuiMessage } from "common/nui";

function toMenu(v: unknown): MenuRequest | null {
  if (!isRecord(v) || typeof v.title !== "string" || !Array.isArray(v.items))
    return null;
  const items: MenuItem[] = v.items.flatMap((i) =>
    isRecord(i) && typeof i.id === "string" && typeof i.label === "string"
      ? [
          {
            id: i.id,
            label: logSafe(i.label, 80),
            icon: typeof i.icon === "string" ? i.icon : undefined,
            description:
              typeof i.description === "string"
                ? logSafe(i.description, 160)
                : undefined,
            disabled: i.disabled === true,
            checked: typeof i.checked === "boolean" ? i.checked : undefined,
          },
        ]
      : [],
  );
  return {
    title: logSafe(v.title, 60),
    items: items.slice(0, 40),
    back: v.back === true,
  };
}

function toInput(v: unknown): InputRequest | null {
  if (!isRecord(v) || typeof v.title !== "string" || !Array.isArray(v.fields))
    return null;
  const fields: InputField[] = v.fields.flatMap((f): InputField[] => {
    if (!isRecord(f) || typeof f.name !== "string" || typeof f.label !== "string")
      return [];
    const placeholder =
      typeof f.placeholder === "string" ? f.placeholder : undefined;
    if (f.type === "number")
      return [
        {
          name: f.name,
          label: f.label,
          type: "number",
          min: typeof f.min === "number" ? f.min : undefined,
          max: typeof f.max === "number" ? f.max : undefined,
          placeholder,
        },
      ];
    return [
      {
        name: f.name,
        label: f.label,
        type: "text",
        maxLength: typeof f.maxLength === "number" ? f.maxLength : 120,
        placeholder,
        multiline: f.multiline === true,
        value: typeof f.value === "string" ? f.value : undefined,
        readOnly: f.readOnly === true,
      },
    ];
  });
  return {
    title: logSafe(v.title, 60),
    fields: fields.slice(0, 8),
    confirm: typeof v.confirm === "string" ? logSafe(v.confirm, 30) : "OK",
  };
}

/**
 * Escape closes the dialogs: the game must not open the pause menu with the same key press once the focus is gone.
 */
class PauseGuard {
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Blocks the pause controls (199, 200) for the next 500 ms. */
  set(on: boolean): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!on) return controls.enable("pauseGuard");
    controls.disable("pauseGuard", [199, 200]);
    this.timer = setTimeout(() => {
      this.timer = null;
      controls.enable("pauseGuard");
    }, 500);
  }
}

export const pauseGuard = new PauseGuard();

/**
 * The menu and input dialog every resource opens through lib `menu` / `input`: one at a time; opening a new one answers
 * the previous request with null. The answer goes back to the asking resource as a local event.
 */
type DialogKind = "menu" | "input" | "items";
const OPEN_MESSAGE: Record<DialogKind, string> = {
  menu: NuiMessage.menuOpen,
  input: NuiMessage.inputOpen,
  items: NuiMessage.itemsOpen,
};

class Dialogs {
  private current: {
    kind: DialogKind;
    resource: string;
    id: number;
  } | null = null;

  open(kind: DialogKind, resource: string, id: number, data: unknown): void {
    this.answer(null);
    this.current = { kind, resource, id };
    SetNuiFocus(true, true);
    SendNUIMessage({ action: OPEN_MESSAGE[kind], data });
  }

  answer(value: unknown): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    SetNuiFocus(false, false);
    pauseGuard.set(true);
    SendNUIMessage({ action: NuiMessage.dialogClose });
    emit(
      current.kind === "input"
        ? MENU_EVENTS.inputResult
        : MENU_EVENTS.menuResult,
      current.resource,
      current.id,
      value,
    );
  }

  toggle(item: unknown, checked: unknown): void {
    if (
      this.current?.kind === "menu" &&
      typeof item === "string" &&
      typeof checked === "boolean"
    )
      emit(
        MENU_EVENTS.menuToggle,
        this.current.resource,
        this.current.id,
        item,
        checked,
      );
  }

  hover(item: unknown): void {
    if (this.current?.kind === "menu" && typeof item === "string")
      emit(MENU_EVENTS.menuHover, this.current.resource, this.current.id, item);
  }

  /** A stopped resource's open dialog closes with it. */
  drop(resource: string): void {
    if (this.current?.resource === resource) this.answer(null);
  }
}

export const dialogs = new Dialogs();

registerExport("OpenMenu", (id: unknown, request: unknown) => {
  const menu = toMenu(request);
  if (typeof id === "number" && menu)
    dialogs.open("menu", GetInvokingResource() || ResourceName, id, menu);
});
registerExport("OpenInput", (id: unknown, request: unknown) => {
  const input = toInput(request);
  if (typeof id === "number" && input)
    dialogs.open("input", GetInvokingResource() || ResourceName, id, input);
});

RegisterNuiCallback(
  NuiCallback.dialogAnswer,
  (data: unknown, cb: (r: unknown) => void) => {
    dialogs.answer(isRecord(data) ? data.value : null);
    cb(true);
  },
);
RegisterNuiCallback(
  NuiCallback.dialogHover,
  (data: unknown, cb: (r: unknown) => void) => {
    dialogs.hover(isRecord(data) ? data.id : null);
    cb(true);
  },
);
RegisterNuiCallback(
  NuiCallback.dialogToggle,
  (data: unknown, cb: (r: unknown) => void) => {
    if (isRecord(data)) dialogs.toggle(data.id, data.checked);
    cb(true);
  },
);
on("onClientResourceStop", (resource: string) => dialogs.drop(resource));
