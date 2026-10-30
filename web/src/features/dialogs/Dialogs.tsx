import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  MENU_BACK,
  type InputRequest,
  type MenuRequest,
} from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { MENU_MOCK } from "../../dev/dialogMock";
import { iconOf } from "../admin/icons";

const answer = (value: unknown) =>
  void fetchNui(NuiCallback.dialogAnswer, { value }, { mockData: true });
const hover = (id: string) =>
  void fetchNui(NuiCallback.dialogHover, { id }, { mockData: true });
const toggle = (id: string, checked: boolean) =>
  void fetchNui(NuiCallback.dialogToggle, { id, checked }, { mockData: true });
const MENU_OPTIONS = { mockData: MENU_MOCK, mockDelay: 200 };
/** Holding Escape this long closes the whole menu flow. */
const HOLD_MS = 600;

/** On / off pill of a switch row. */
function SwitchPill({ on }: { on: boolean }) {
  return (
    <span
      className={`relative ml-auto h-[2vh] w-[3.6vh] shrink-0 rounded-full transition-colors duration-150 ${on ? "bg-tgi-green group-enabled:group-focus:bg-black/25" : "bg-white/15 group-enabled:group-focus:bg-black/15"}`}
    >
      <span
        className="absolute top-[0.25vh] left-[0.25vh] size-[1.5vh] rounded-full bg-white transition-transform duration-150"
        style={{ transform: on ? "translateX(1.6vh)" : "translateX(0)" }}
      />
    </span>
  );
}

/**
 * A resource's menu (tgiann-core menu): title pill and a list on the right; the row under the pointer or keyboard
 * focus fills green (one highlight: the pointer moves the focus); click picks, a switch row flips in place, Escape
 * closes (answers null).
 */
function MenuPanel({ menu, holding }: { menu: MenuRequest; holding: boolean }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  // The first item takes the focus, so arrows and Enter work at once; switch rows start from the request.
  useEffect(() => {
    setChecks(
      Object.fromEntries(
        menu.items.flatMap((i) =>
          i.checked === undefined ? [] : [[i.id, i.checked]],
        ),
      ),
    );
    document
      .querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')
      ?.focus();
  }, [menu]);
  return (
    <motion.section
      initial={{ opacity: 0, x: "2vh" }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        duration: 0.3,
        bounce: 0,
        opacity: { type: "tween", duration: 0.25, ease: "easeOut" },
      }}
      className="fixed inset-y-0 right-[3vh] my-auto flex h-fit w-[38vh] flex-col gap-[0.6vh]"
      role="menu"
      aria-label={menu.title}
    >
      <header className="flex h-[4.4vh] items-center justify-between gap-[1vh] rounded-full bg-panel pr-[0.6vh] pl-[1.8vh]">
        <span className="truncate font-display text-[1.5vh] leading-none font-extrabold tracking-[-0.01em] uppercase">
          {menu.title}
        </span>
        <span className="relative flex h-[3.2vh] items-center overflow-hidden rounded-full bg-control px-[1.2vh] text-[1.1vh] font-bold text-text-3">
          {/* Fills while Escape is held: full = the whole menu closes. */}
          <span
            className="absolute inset-y-0 left-0 bg-tgi-green-30"
            style={{
              width: holding ? "100%" : "0%",
              transition: holding ? `width ${HOLD_MS}ms linear` : "none",
            }}
          />
          <span className="relative">{menu.back ? "ESC ←" : "ESC"}</span>
        </span>
      </header>
      <div className="flex max-h-[60vh] flex-col gap-[0.4vh] overflow-y-auto rounded-[1.4vh] bg-panel p-[0.6vh]">
        {menu.items.map((item) => {
          const icon = item.icon ? iconOf(item.icon) : null;
          const checked = checks[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={checked}
              disabled={item.disabled}
              onClick={() => {
                if (checked === undefined) return answer(item.id);
                setChecks((c) => ({ ...c, [item.id]: !checked }));
                toggle(item.id, !checked);
              }}
              onMouseEnter={(e) => e.currentTarget.focus()}
              onFocus={() => hover(item.id)}
              className="group flex min-h-[5vh] items-center gap-[1.2vh] rounded-[0.9vh] px-[0.8vh] py-[0.7vh] text-left transition-colors duration-150 outline-none enabled:focus:bg-tgi-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              {icon && (
                <span className="flex size-[3.4vh] shrink-0 items-center justify-center rounded-full bg-tgi-green-10 text-[1.4vh] text-tgi-green transition-colors duration-150 group-enabled:group-focus:bg-black/10 group-enabled:group-focus:text-tgi-green-text">
                  <FontAwesomeIcon icon={icon} />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-[0.2vh]">
                <span className="truncate text-[1.45vh] font-semibold uppercase transition-colors duration-150 group-enabled:group-focus:text-tgi-green-text">
                  {item.label}
                </span>
                {item.description && (
                  <span className="truncate text-[1.25vh] text-text-3 transition-colors duration-150 group-enabled:group-focus:text-tgi-green-text">
                    {item.description}
                  </span>
                )}
              </span>
              {checked !== undefined && <SwitchPill on={checked} />}
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

function InputPanel({ input }: { input: InputRequest }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      input.fields.flatMap((f) =>
        f.type === "text" && f.value !== undefined ? [[f.name, f.value]] : [],
      ),
    ),
  );
  const parsed = Object.fromEntries(
    input.fields.map((f) => [
      f.name,
      f.type === "number"
        ? Number(values[f.name] ?? "")
        : (values[f.name] ?? "").trim(),
    ]),
  );
  const valid = input.fields.every((f) =>
    f.type === "number"
      ? Number.isFinite(parsed[f.name]) &&
        values[f.name] !== undefined &&
        values[f.name] !== ""
      : f.readOnly === true || String(parsed[f.name] ?? "") !== "",
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && answer(null)}
      title={input.title}
    >
      <form
        className="flex flex-col gap-[1.4vh]"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) answer(parsed);
        }}
      >
        {input.fields.map((f, i) => (
          <label key={f.name} className="flex flex-col gap-[0.5vh]">
            <span className="px-[0.4vh] text-[1.2vh] font-semibold text-text-3 uppercase">
              {f.label}
            </span>
            {f.type === "text" && f.multiline ? (
              <textarea
                autoFocus={i === 0 && !f.readOnly}
                readOnly={f.readOnly}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
                className="h-[18vh] w-full resize-none rounded-[1.2vh] border border-white/8 bg-[#2222224D] px-[1.4vh] py-[1vh] text-[1.35vh] leading-[1.45] text-text [color-scheme:dark] transition-[border-color] duration-150 outline-none placeholder:text-text-4 hover:border-white/14 read-only:hover:border-white/8 focus:border-tgi-green-40"
              />
            ) : (
              <Input
                autoFocus={i === 0 && !(f.type === "text" && f.readOnly)}
                type={f.type}
                readOnly={f.type === "text" ? f.readOnly : undefined}
                min={f.type === "number" ? f.min : undefined}
                max={f.type === "number" ? f.max : undefined}
                maxLength={f.type === "text" ? f.maxLength : undefined}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              />
            )}
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
  const [holding, setHolding] = useState(false);

  // The client checked both shapes (resource/client/menu.ts).
  useNuiEvent<MenuRequest>(
    NuiMessage.menuOpen,
    (m) => setMenu(m),
    MENU_OPTIONS,
  );
  useNuiEvent<InputRequest>(NuiMessage.inputOpen, (m) => setInput(m));
  useNuiEvent(NuiMessage.dialogClose, () => {
    setMenu(null);
    setInput(null);
  });

  useEffect(() => {
    if (!menu) return;
    // Escape: a tap goes back in a sub menu (closes a top menu), holding it closes the whole flow. Both answer when the
    // key comes up: closing while it is still down hands the release to the game, which opens the pause menu.
    let timer: ReturnType<typeof setTimeout> | null = null;
    let held = false;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[role^="menuitem"]:not(:disabled)',
          ),
        ];
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          e.key === "ArrowDown"
            ? (at + 1) % items.length
            : (at - 1 + items.length) % items.length;
        items[at === -1 ? 0 : next]?.focus();
        return;
      }
      if (e.key !== "Escape" || e.repeat || timer || held) return;
      setHolding(true);
      timer = setTimeout(() => {
        timer = null;
        held = true;
      }, HOLD_MS);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (!timer && !held)) return;
      if (timer) clearTimeout(timer);
      timer = null;
      setHolding(false);
      answer(held || !menu.back ? null : MENU_BACK);
      held = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [menu]);

  return (
    <>
      {menu && <MenuPanel menu={menu} holding={holding} />}
      {input && <InputPanel input={input} />}
    </>
  );
}
