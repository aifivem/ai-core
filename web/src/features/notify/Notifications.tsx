import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faCircleInfo, faTriangleExclamation, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { Notification, NotificationKind } from "@aicore-fivem/shared";
import { NuiMessage } from "../../../../resource/common/nui";
import { NOTIFY_MOCK, PROGRESS_MOCK } from "../../dev/notifyMock";

interface Card extends Notification {
  id: number;
}

const LOOK: Record<NotificationKind, { icon: IconDefinition; color: string }> = {
  success: { icon: faCircleCheck, color: "var(--accent)" },
  error: { icon: faCircleExclamation, color: "var(--danger)" },
  warning: { icon: faTriangleExclamation, color: "var(--warn)" },
  info: { icon: faCircleInfo, color: "var(--text-2)" },
};
let nextId = 0;
const NOTIFY_OPTIONS = { mockData: NOTIFY_MOCK, mockDelay: 200 };
const PROGRESS_OPTIONS = { mockData: PROGRESS_MOCK, mockDelay: 200 };

function NotificationCard({ card, onDone }: { card: Card; onDone: (id: number) => void }) {
  const look = LOOK[card.kind];
  useEffect(() => {
    const timer = setTimeout(() => onDone(card.id), card.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [card, onDone]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: "3vh" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "3vh", transition: { duration: 0.15, ease: "easeOut" } }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      role="status"
      className="flex w-[36vh] items-center gap-[1.2vh] overflow-hidden rounded-[1vh] border border-line bg-panel py-[1.2vh] pr-[1.4vh] [box-shadow:0_0.8vh_2.4vh_rgba(0,0,0,0.35)]"
    >
      <span className="h-[3.6vh] w-[0.4vh] shrink-0 rounded-r-full" style={{ background: look.color }} />
      <FontAwesomeIcon icon={look.icon} className="text-[2vh]" style={{ color: look.color }} />
      <div className="flex min-w-0 flex-col gap-[0.3vh]">
        {card.title && <span className="text-[1.4vh] font-semibold text-text">{card.title}</span>}
        <span className="text-[1.3vh] leading-[1.4] text-text-2">{card.text}</span>
      </div>
    </motion.div>
  );
}

/** Notification cards top right and the progress bar bottom centre, for every resource (lib `notify` / `progress`). */
export function Notifications() {
  const [cards, setCards] = useState<Card[]>([]);
  const [bar, setBar] = useState<{ label: string; duration: number; key: number } | null>(null);
  const remove = (id: number) => setCards((prev) => prev.filter((c) => c.id !== id));

  // The client checked the shape (resource/client/notify.ts); the mock sends a list.
  useNuiEvent(
    NuiMessage.notify,
    (data: Notification | Notification[]) => {
      const list = Array.isArray(data) ? data : [data];
      setCards((prev) => [...prev, ...list.map((n) => ({ ...n, id: ++nextId }))].slice(-5));
    },
    NOTIFY_OPTIONS,
  );
  useNuiEvent(NuiMessage.progressShow, (data: { label: string; duration: number }) => setBar({ ...data, key: ++nextId }), PROGRESS_OPTIONS);
  useNuiEvent(NuiMessage.progressHide, () => setBar(null));

  return (
    <>
      <div className="pointer-events-none fixed right-[3vh] top-[4vh] flex flex-col items-end gap-[0.8vh]">
        <AnimatePresence initial={false}>
          {cards.map((card) => (
            <NotificationCard key={card.id} card={card} onDone={remove} />
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {bar && (
          <motion.div
            key={bar.key}
            initial={{ opacity: 0, y: "1vh" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="pointer-events-none fixed inset-x-0 bottom-[12vh] mx-auto flex w-[34vh] flex-col gap-[0.8vh] rounded-[1vh] border border-line bg-panel p-[1.2vh]"
          >
            <span className="text-[1.3vh] font-medium text-text-2">{bar.label}</span>
            <div className="h-[0.5vh] overflow-hidden rounded-full bg-raised">
              <div className="h-full origin-left rounded-full bg-accent" style={{ animation: `progress-fill ${bar.duration}ms linear both` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
