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

/** A resource's menu (tgiann-core menu): title pill and a list on the right; hover fills a row green; click picks, Escape closes (answers null). */
function MenuPanel({ menu }: { menu: MenuRequest }) {
  return (
    <motion.section
      initial={{ opacity: 0, x: "2vh" }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0, opacity: { type: "tween", duration: 0.25, ease: "easeOut" } }}
      className="fixed inset-y-0 right-[3vh] my-auto flex h-fit w-[38vh] flex-col gap-[0.6vh]"
      role="menu"
      aria-label={menu.title}
    >
      <header className="flex h-[4.4vh] items-center justify-between gap-[1vh] rounded-full bg-panel pl-[1.8vh] pr-[0.6vh]">
        <span className="truncate font-display font-extrabold text-[1.5vh] leading-none tracking-[-0.01em] uppercase">{menu.title}</span>
        <span className="flex h-[3.2vh] items-center rounded-full bg-control px-[1.2vh] text-[1.1vh] font-bold text-text-3">ESC</span>
      </header>
      <div className="flex max-h-[60vh] flex-col gap-[0.4vh] overflow-y-auto rounded-[1.4vh] bg-panel p-[0.6vh]">
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
              className="group flex min-h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] px-[0.8vh] py-[0.7vh] text-left transition-colors duration-150 enabled:hover:bg-tgi-green enabled:focus-visible:bg-tgi-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              {icon && (
                <span className="flex size-[3.4vh] shrink-0 items-center justify-center rounded-full bg-tgi-green-10 text-[1.4vh] text-tgi-green transition-colors duration-150 group-enabled:group-hover:bg-black/10 group-enabled:group-hover:text-tgi-green-text group-enabled:group-focus-visible:bg-black/10 group-enabled:group-focus-visible:text-tgi-green-text">
                  <FontAwesomeIcon icon={icon} />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-[0.2vh]">
                <span className="truncate text-[1.45vh] font-semibold uppercase transition-colors duration-150 group-enabled:group-hover:text-tgi-green-text group-enabled:group-focus-visible:text-tgi-green-text">
                  {item.label}
                </span>
                {item.description && (
                  <span className="truncate text-[1.25vh] text-text-3 transition-colors duration-150 group-enabled:group-hover:text-tgi-green-text group-enabled:group-focus-visible:text-tgi-green-text">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
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
        className="flex flex-col gap-[1.4vh]"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) answer(parsed);
        }}
      >
        {input.fields.map((f, i) => (
          <label key={f.name} className="flex flex-col gap-[0.5vh]">
            <span className="px-[0.4vh] text-[1.2vh] font-semibold text-text-3 uppercase">{f.label}</span>
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
        <Button type="submit" variant="primary" disabled={!valid}>
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
