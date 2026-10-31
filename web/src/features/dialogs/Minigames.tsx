import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import type {
  LockpickResult,
  MinigameRequest,
  SkillStage,
} from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import { MINIGAME_MOCK } from "../../dev/dialogMock";

export type MinigameTexts = Record<
  "move" | "turn" | "press" | "cancel" | "picks",
  string
>;
export type MinigameMessage = MinigameRequest & { texts: MinigameTexts };

const answer = (value: unknown) =>
  void fetchNui(NuiCallback.dialogAnswer, { value }, { mockData: true });
/** How long the hit / miss colour shows before the answer closes the dialog. */
const FLASH_MS = 220;
const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

function Key({ children }: { children: string }) {
  return (
    <span className="flex h-[2.6vh] min-w-[2.6vh] items-center justify-center rounded-[0.6vh] bg-white/10 px-[0.6vh] text-[1.15vh] font-bold uppercase">
      {children}
    </span>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-[0.5vh] text-[1.2vh] font-semibold text-text-3">
      {keys.map((k) => (
        <Key key={k}>{k}</Key>
      ))}
      <span className="ml-[0.3vh]">{label}</span>
    </span>
  );
}

/** Escape answers on key up: closing while it is still down hands the release to the game (pause menu). */
function useEscape(onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler.current();
    };
    window.addEventListener("keyup", up);
    return () => window.removeEventListener("keyup", up);
  }, []);
}

const FALLBACK_STAGE: SkillStage = { area: 50, speed: 0.6 };
/** Where a stage's green arc starts: never in the first quarter, so there is time to react. */
const zoneStart = (area: number) => 100 + Math.random() * (240 - area);

/**
 * A needle runs once around the ring per stage; the shown key pressed while it is on the green arc passes the stage.
 * The needle moves in a ref (no render per frame); a miss, a wrong key, the needle leaving the arc or Escape fails.
 */
function SkillCheck({
  stages,
  keys,
  texts,
}: {
  stages: SkillStage[];
  keys: string[];
  texts: MinigameTexts;
}) {
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const stage = stages[index] ?? FALLBACK_STAGE;
  const [round, setRound] = useState(() => ({
    start: zoneStart(stage.area),
    key: keys[Math.floor(Math.random() * keys.length)] ?? "e",
  }));
  const needle = useRef<SVGGElement>(null);
  const angle = useRef(0);
  const done = useRef(false);

  const finish = (ok: boolean) => {
    if (done.current) return;
    done.current = true;
    setFlash(ok ? "hit" : "miss");
    setTimeout(() => answer(ok), FLASH_MS);
  };
  const pass = () => {
    if (index + 1 >= stages.length) return finish(true);
    const next = stages[index + 1] ?? FALLBACK_STAGE;
    setFlash("hit");
    setTimeout(() => setFlash(null), FLASH_MS);
    setIndex(index + 1);
    setRound({
      start: zoneStart(next.area),
      key: keys[Math.floor(Math.random() * keys.length)] ?? "e",
    });
  };

  useEffect(() => {
    angle.current = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      // A frame hitch never jumps the needle over the arc.
      angle.current += Math.min(0.05, (now - last) / 1000) * stage.speed * 360;
      last = now;
      if (needle.current)
        needle.current.style.transform = `rotate(${angle.current}deg)`;
      if (angle.current > round.start + stage.area + 4) return finish(false);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // finish only reads refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, stage]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || done.current || !/^[a-z0-9]$/i.test(e.key)) return;
      const a = angle.current;
      const inside = a >= round.start - 2 && a <= round.start + stage.area + 2;
      if (inside && e.key.toLowerCase() === round.key) pass();
      else finish(false);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  });
  useEscape(() => finish(false));

  const arc = flash === "miss" ? "#ff5c5c" : "var(--color-tgi-green)";
  return (
    <div className="flex flex-col items-center gap-[2vh]">
      <div className="relative size-[18vh]">
        <svg viewBox="0 0 100 100" className="size-full">
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="rgba(0,0,0,0.7)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={arc}
            strokeWidth="6"
            strokeDasharray={`${(CIRCUMFERENCE * stage.area) / 360} ${CIRCUMFERENCE}`}
            transform={`rotate(${round.start - 90} 50 50)`}
          />
          <g
            ref={needle}
            style={{ transformOrigin: "50px 50px", transform: "rotate(0deg)" }}
          >
            <line
              x1="50"
              y1="2"
              x2="50"
              y2="16"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        </svg>
        <span
          className={`absolute inset-0 m-auto flex size-[6vh] items-center justify-center rounded-full text-[2.6vh] font-extrabold uppercase transition-colors duration-150 ${flash === "hit" ? "bg-tgi-green text-tgi-green-text" : flash === "miss" ? "bg-[#ff5c5c] text-black" : "bg-white/10"}`}
        >
          {round.key}
        </span>
      </div>
      <div className="flex items-center gap-[0.6vh]">
        {stages.map((_, i) => (
          <span
            key={i}
            className={`size-[0.9vh] rounded-full ${i < index ? "bg-tgi-green" : i === index ? "bg-white" : "bg-white/20"}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-[1.6vh] rounded-full bg-black/70 px-[1.6vh] py-[0.8vh]">
        <Hint keys={[round.key]} label={texts.press} />
        <Hint keys={["esc"]} label={texts.cancel} />
      </div>
    </div>
  );
}

const MOVE_SPEED = 90;
const TURN_SPEED = 140;
const RETURN_SPEED = 220;
/** Degrees past the sweet spot's edge where the lock stops turning at all. */
const FALLOFF = 40;
/** Seconds of forcing a stuck lock before the pick breaks. */
const PICK_LIFE = 0.9;

/**
 * The pick sits on a half circle (A / D or the arrows move it); W, the up arrow or Space turns the lock. The lock
 * turns all the way only with the pick in the sweet spot, less the further it is; forcing a stuck lock wears the pick.
 * Every frame works on refs and element styles; React only renders pin, pick and result changes.
 */
function Lockpick({
  pins,
  area,
  picks,
  texts,
}: {
  pins: number;
  area: number;
  picks: number;
  texts: MinigameTexts;
}) {
  const [pin, setPin] = useState(0);
  const [left, setLeft] = useState(picks);
  const [flash, setFlash] = useState<"open" | "broke" | null>(null);
  const pick = useRef<SVGGElement>(null);
  const cylinder = useRef<SVGGElement>(null);
  const state = useRef({
    angle: 90,
    turn: 0,
    life: 1,
    sweet: 20 + Math.random() * 140,
    pin: 0,
    left: picks,
    done: false,
  });
  const held = useRef(new Set<string>());

  useEffect(() => {
    const s = state.current;
    const finish = (result: LockpickResult) => {
      s.done = true;
      setFlash(result === "opened" ? "open" : "broke");
      setTimeout(() => answer(result), result === "cancelled" ? 0 : 400);
    };
    const down = (e: KeyboardEvent) => held.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => {
      held.current.delete(e.key.toLowerCase());
      if (e.key === "Escape" && !s.done) finish("cancelled");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (s.done) return;
      const keys = held.current;
      const turning = keys.has("w") || keys.has("arrowup") || keys.has(" ");
      let shake = 0;
      if (turning) {
        const off = Math.max(0, Math.abs(s.angle - s.sweet) - area / 2);
        const max = 90 * Math.max(0, 1 - off / FALLOFF);
        s.turn = Math.min(max, s.turn + TURN_SPEED * dt);
        if (s.turn >= 90) {
          s.pin += 1;
          s.turn = 0;
          s.sweet = 20 + Math.random() * 140;
          setPin(s.pin);
          if (s.pin >= pins) return finish("opened");
        } else if (s.turn >= max) {
          s.life -= dt / PICK_LIFE;
          shake = (Math.random() - 0.5) * 6;
          if (s.life <= 0) {
            s.left -= 1;
            s.life = 1;
            s.turn = 0;
            setLeft(s.left);
            setFlash("broke");
            setTimeout(() => setFlash(null), 300);
            if (s.left <= 0) return finish("broken");
          }
        }
      } else {
        s.turn = Math.max(0, s.turn - RETURN_SPEED * dt);
        const dir =
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
        s.angle = Math.min(180, Math.max(0, s.angle + dir * MOVE_SPEED * dt));
      }
      if (cylinder.current)
        cylinder.current.style.transform = `rotate(${s.turn}deg)`;
      if (pick.current)
        pick.current.style.transform = `rotate(${s.angle - 90 + s.turn + shake}deg)`;
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [area, pins]);

  const ring =
    flash === "open"
      ? "var(--color-tgi-green)"
      : flash === "broke"
        ? "#ff5c5c"
        : "rgba(255,255,255,0.12)";
  return (
    <div className="flex flex-col items-center gap-[2vh]">
      <div className="relative size-[24vh]">
        <svg viewBox="0 0 100 100" className="size-full overflow-visible">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="rgba(0,0,0,0.7)"
            stroke={ring}
            strokeWidth="3"
            style={{ transition: "stroke 150ms" }}
          />
          <g
            ref={cylinder}
            style={{ transformOrigin: "50px 50px", transform: "rotate(0deg)" }}
          >
            <circle
              cx="50"
              cy="50"
              r="24"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
            />
            <circle cx="50" cy="46" r="4" fill="rgba(0,0,0,0.8)" />
            <rect
              x="48"
              y="46"
              width="4"
              height="12"
              rx="1.5"
              fill="rgba(0,0,0,0.8)"
            />
          </g>
          <g
            ref={pick}
            style={{ transformOrigin: "50px 50px", transform: "rotate(0deg)" }}
          >
            <line
              x1="50"
              y1="48"
              x2="50"
              y2="6"
              stroke="#d9d9d9"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="50"
              y1="48"
              x2="47"
              y2="45"
              stroke="#d9d9d9"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      <div className="flex items-center gap-[1.4vh]">
        {pins > 1 && (
          <div className="flex items-center gap-[0.6vh]">
            {Array.from({ length: pins }, (_, i) => (
              <span
                key={i}
                className={`size-[0.9vh] rounded-full ${i < pin ? "bg-tgi-green" : i === pin ? "bg-white" : "bg-white/20"}`}
              />
            ))}
          </div>
        )}
        <span className="text-[1.25vh] font-bold text-text-2 uppercase">
          {texts.picks}: {left}
        </span>
      </div>
      <div className="flex items-center gap-[1.6vh] rounded-full bg-black/70 px-[1.6vh] py-[0.8vh]">
        <Hint keys={["a", "d"]} label={texts.move} />
        <Hint keys={["w"]} label={texts.turn} />
        <Hint keys={["esc"]} label={texts.cancel} />
      </div>
    </div>
  );
}

/** Skill checks and lockpicks other resources start (lib `skillCheck` / `lockpick`), centred over the game. */
export function Minigames() {
  const [game, setGame] = useState<(MinigameMessage & { key: number }) | null>(
    null,
  );
  // The client checked the shape (resource/client/minigame.ts).
  useNuiEvent<MinigameMessage>(
    NuiMessage.minigameOpen,
    (m) => setGame({ ...m, key: performance.now() }),
    { mockData: MINIGAME_MOCK, mockDelay: 200 },
  );
  useNuiEvent(NuiMessage.dialogClose, () => setGame(null));
  if (!game) return null;
  return (
    <motion.div
      key={game.key}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="fixed inset-0 m-auto flex h-fit w-fit"
    >
      {game.kind === "skillCheck" ? (
        <SkillCheck stages={game.stages} keys={game.keys} texts={game.texts} />
      ) : (
        <Lockpick
          pins={game.pins}
          area={game.area}
          picks={game.picks}
          texts={game.texts}
        />
      )}
    </motion.div>
  );
}
