import type { Notification } from "@aicore-fivem/shared";

/** Browser preview only: `?view=notify` shows a notification of each kind and a running progress bar. */
const view = new URLSearchParams(window.location.search).get("view");

export const NOTIFY_MOCK: Notification[] | undefined =
  view === "notify"
    ? [
        {
          kind: "success",
          title: "Purchase",
          text: "You bought 3x Water for $15.",
          duration: 8000,
        },
        {
          kind: "error",
          text: "You do not have enough money.",
          duration: 8000,
        },
        {
          kind: "warning",
          text: "Your vehicle is low on fuel.",
          duration: 8000,
        },
        {
          kind: "info",
          text: "Keys 1-5 use the first five cells.",
          duration: 8000,
        },
      ]
    : undefined;

export const PROGRESS_MOCK =
  view === "notify" ? { label: "Eating a burger", duration: 6000 } : undefined;
