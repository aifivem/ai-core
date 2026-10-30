import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faFlagCheckered } from "@fortawesome/free-solid-svg-icons";
import { NuiCallback, NuiMessage } from "../../../../resource/common/nui";
import type { SetupWelcome } from "../../../../resource/common/setup";
import { Button } from "../../components/ui/button";
import en from "../../../../locales/en.json";

const view = new URLSearchParams(window.location.search).get("view");
// Browser preview only: `?view=welcome` (`&admin=1` as an admin).
const MOCK =
  view === "welcome"
    ? {
        mockData: {
          admin: new URLSearchParams(window.location.search).has("admin"),
          adminLine: "add_principal identifier.fivem:123456 group.admin",
          texts: en,
        },
        mockDelay: 200,
      }
    : {};

type Welcome = SetupWelcome & { texts: Record<string, string> };

/** Copies through a hidden text box: the game's browser has no clipboard API for pages. */
function copy(text: string): void {
  const box = document.createElement("textarea");
  box.value = text;
  document.body.appendChild(box);
  box.select();
  document.execCommand("copy");
  box.remove();
}

function close(openPanel: boolean): void {
  void fetchNui(
    NuiCallback.setupWelcomeClose,
    { openPanel },
    { mockData: true },
  );
}

/** The card a player sees after spawning while the server owner has not finished the setup guide. */
export function Welcome() {
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [copied, setCopied] = useState(false);
  // ai-core's client built the payload; only its parts are read.
  useNuiEvent<Welcome>(NuiMessage.setupWelcome, setWelcome, MOCK);
  useEffect(() => {
    if (!welcome) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setWelcome(null);
      close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [welcome]);
  if (!welcome) return null;
  const t = (key: string) => welcome.texts[key] ?? key;

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/50">
      <motion.section
        initial={{ opacity: 0, y: "1.2vh" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        role="dialog"
        aria-labelledby="welcome-title"
        className="flex w-[56vh] flex-col gap-[2vh] rounded-[1.8vh] bg-panel p-[3vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.1),inset_0_0.1vh_0_rgba(255,255,255,0.06),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]"
      >
        <span className="flex size-[5.6vh] items-center justify-center rounded-[1.2vh] bg-tgi-green-10 text-[2.4vh] text-tgi-green">
          <FontAwesomeIcon icon={faFlagCheckered} aria-hidden />
        </span>
        <div className="flex flex-col gap-[1vh]">
          <h2
            id="welcome-title"
            className="font-display text-[2.2vh] leading-[1.15] font-extrabold uppercase"
          >
            {t("SETUP_WELCOME_TITLE")}
          </h2>
          <p className="text-[1.45vh] leading-[1.5] text-text-2">
            {t(welcome.admin ? "SETUP_WELCOME_ADMIN" : "SETUP_WELCOME_PLAYER")}
          </p>
        </div>
        {!welcome.admin && welcome.adminLine && (
          <div className="flex flex-col gap-[0.8vh]">
            <span className="text-[1.2vh] font-semibold text-text-3 uppercase">
              {t("SETUP_WELCOME_LINE")}
            </span>
            <div className="flex items-center gap-[1vh] rounded-[1vh] bg-black/30 p-[1vh] pl-[1.4vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.06)]">
              <code className="min-w-0 flex-1 truncate font-mono text-[1.3vh] text-tgi-green select-all">
                {welcome.adminLine}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  copy(welcome.adminLine);
                  setCopied(true);
                }}
              >
                <FontAwesomeIcon icon={faCopy} aria-hidden />
                {t(copied ? "SETUP_WELCOME_COPIED" : "SETUP_WELCOME_COPY")}
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-[1vh]">
          <Button
            variant={welcome.admin ? "ghost" : "primary"}
            onClick={() => {
              setWelcome(null);
              close(false);
            }}
          >
            {t("SETUP_WELCOME_OK")}
          </Button>
          {welcome.admin && (
            <Button
              variant="primary"
              onClick={() => {
                setWelcome(null);
                close(true);
              }}
            >
              {t("SETUP_WELCOME_OPEN")}
            </Button>
          )}
        </div>
      </motion.section>
    </div>
  );
}
