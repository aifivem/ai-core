import type { PhoneClientAdapter } from "@aifivem/shared";

/** tgiann-phone: its client fires the local `tgiann-phone:hook:visibility (isOpen, onScreen)` (read in its `compat/lb-phone/client.lua`, 2.0.0-b8). */
export const tgiannPhone: PhoneClientAdapter = {
  resource: "tgiann-phone",
  watch: (opened) => {
    // The hook repeats `isOpen` when only `onScreen` changes.
    let open = false;
    on("tgiann-phone:hook:visibility", (isOpen: unknown) => {
      if (isOpen === true && !open) opened();
      open = isOpen === true;
    });
  },
};
