import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { InputRequest, MenuRequest } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { MENU_MOCK } from "../../dev/dialogMock";
import { iconOf } from "../admin/icons";

const answer = (value: unknown) => void fetchNui(NuiCallback.dialogAnswer, { value }, { mockData: true });
const hover = (id: string) => void fetchNui(NuiCallback.dialogHover, { id }, { mockData: true });
const MENU_OPTIONS = { mockData: MENU_MOCK, mockDelay: 200 };

/** A resource's menu: a list on the right; click picks, Escape closes (answers null). */
function MenuPanel({ menu }: { menu: MenuRequest }) {
  return (
    <motion.section
      initial={{ opacity: 0, x: "2vh" }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="fixed right-[3vh] top-1/2 flex w-[36vh] -translate-y-1/2 flex-col gap-[0.6vh] rounded-[1.2vh] border border-line bg-panel p-[1.4vh] [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.5)]"
      role="menu"
      aria-label={menu.title}
    >
      <span className="px-[0.6vh] pb-[0.6vh] text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{menu.title}</span>
      {menu.items.map((item) => {
        const icon = item.icon ? iconOf(item.icon) : null;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => answer(item.id)}
            onMouseEnter={() => hover(item.id)}
            onFocus={() => hover(item.id)}
            className="flex items-center gap-[1.2vh] rounded-[0.8vh] px-[1.2vh] py-[1vh] text-left transition-colors duration-150 hover:bg-raised disabled:opacity-40"
          >
            {icon && <FontAwesomeIcon icon={icon} className="w-[1.8vh] text-[1.5vh] text-accent" />}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[1.45vh] font-medium text-text">{item.label}</span>
              {item.description && <span className="truncate text-[1.2vh] text-text-3">{item.description}</span>}
            </span>
          </button>
        );
      })}
    </motion.section>
  );
}

function InputPanel({ input }: { input: InputRequest }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const parsed = Object.fromEntries(input.fields.map((f) => [f.name, f.type === "number" ? Number(values[f.name] ?? "") : (values[f.name] ?? "").trim()]));
  const valid = input.fields.every((f) =>
    f.type === "number" ? Number.isFinite(parsed[f.name]) && values[f.name] !== undefined && values[f.name] !== "" : String(parsed[f.name] ?? "") !== "",
  );
  return (
    <Dialog open onOpenChange={(open) => !open && answer(null)} title={input.title}>
      <form
        className="flex flex-col gap-[1.2vh]"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) answer(parsed);
        }}
      >
        {input.fields.map((f, i) => (
          <label key={f.name} className="flex flex-col gap-[0.5vh]">
            <span className="text-[1.25vh] text-text-3">{f.label}</span>
            <Input
              autoFocus={i === 0}
              type={f.type}
              min={f.type === "number" ? f.min : undefined}
              max={f.type === "number" ? f.max : undefined}
              maxLength={f.type === "text" ? f.maxLength : undefined}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </label>
        ))}
        <Button type="submit" variant="filled" disabled={!valid}>
          {input.confirm}
        </Button>
      </form>
    </Dialog>
  );
}

/** The menu and input dialog other resources open (lib `menu` / `input`). */
export function Dialogs() {
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [input, setInput] = useState<InputRequest | null>(null);

  // The client checked both shapes (resource/client/menu.ts).
  useNuiEvent<MenuRequest>(NuiMessage.menuOpen, (m) => setMenu(m), MENU_OPTIONS);
  useNuiEvent<InputRequest>(NuiMessage.inputOpen, (m) => setInput(m));
  useNuiEvent(NuiMessage.dialogClose, () => {
    setMenu(null);
    setInput(null);
  });

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && answer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <>
      {menu && <MenuPanel menu={menu} />}
      {input && <InputPanel input={input} />}
    </>
  );
}
