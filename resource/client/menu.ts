import { registerExport } from "@aicore-fivem/lib/client";
import { logSafe } from "@aicore-fivem/lib/shared";
import {
  MENU_EVENTS,
  type InputField,
  type InputRequest,
  type MenuItem,
  type MenuRequest,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { NuiCallback, NuiMessage } from "common/nui";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toMenu(v: unknown): MenuRequest | null {
  if (!isObj(v) || typeof v.title !== "string" || !Array.isArray(v.items))
    return null;
  const items: MenuItem[] = v.items.flatMap((i) =>
    isObj(i) && typeof i.id === "string" && typeof i.label === "string"
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
          },
        ]
      : [],
  );
  return { title: logSafe(v.title, 60), items: items.slice(0, 40) };
}

function toInput(v: unknown): InputRequest | null {
  if (!isObj(v) || typeof v.title !== "string" || !Array.isArray(v.fields))
    return null;
  const fields: InputField[] = v.fields.flatMap((f): InputField[] => {
    if (!isObj(f) || typeof f.name !== "string" || typeof f.label !== "string")
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
 * The menu and input dialog every resource opens through lib `menu` / `input`: one at a time; opening a new one answers
 * the previous request with null. The answer goes back to the asking resource as a local event.
 */
class Dialogs {
  private current: {
    kind: "menu" | "input";
    resource: string;
    id: number;
  } | null = null;

  open(
    kind: "menu" | "input",
    resource: string,
    id: number,
    data: MenuRequest | InputRequest,
  ): void {
    this.answer(null);
    this.current = { kind, resource, id };
    SetNuiFocus(true, true);
    SendNUIMessage({
      action: kind === "menu" ? NuiMessage.menuOpen : NuiMessage.inputOpen,
      data,
    });
  }

  answer(value: unknown): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    SetNuiFocus(false, false);
    SendNUIMessage({ action: NuiMessage.dialogClose });
    emit(
      current.kind === "menu"
        ? MENU_EVENTS.menuResult
        : MENU_EVENTS.inputResult,
      current.resource,
      current.id,
      value,
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

const dialogs = new Dialogs();

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
    dialogs.answer(isObj(data) ? data.value : null);
    cb(true);
  },
);
RegisterNuiCallback(
  NuiCallback.dialogHover,
  (data: unknown, cb: (r: unknown) => void) => {
    dialogs.hover(isObj(data) ? data.id : null);
    cb(true);
  },
);
on("onClientResourceStop", (resource: string) => dialogs.drop(resource));
