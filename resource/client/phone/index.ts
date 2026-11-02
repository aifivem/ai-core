import { every, GlobalKey, stateString } from "@aifivem/lib/client";
import { createLogger } from "@aifivem/lib/shared";
import { CORE, type PhoneClientAdapter } from "@aifivem/shared";
import { AdapterFollower } from "common/adapterFollower";
import { mov17Phone } from "./adapters/17mov_Phone";
import { codemPhone } from "./adapters/codem-phone";
import { gksPhone } from "./adapters/gksphone";
import { highPhone } from "./adapters/high-phone";
import { lbPhone } from "./adapters/lb-phone";
import { qsSmartphone } from "./adapters/qs-smartphone";
import { roadPhone } from "./adapters/roadphone";
import { tgiannPhone } from "./adapters/tgiann-phone";
import { ySeries } from "./adapters/yseries";

/** Client halves of the phones (server list: `server/phone/index.ts`). */
const ADAPTERS: readonly PhoneClientAdapter[] = [
  tgiannPhone,
  lbPhone,
  gksPhone,
  mov17Phone,
  ySeries,
  highPhone,
  roadPhone,
  qsSmartphone,
  codemPhone,
];

/** Openings closer than this count once: a phone opened and closed again and again is one use. */
const USED_GAP_MS = 10_000;

/**
 * The client half of the phone layer: follows the phone the server picked and tells every resource when the local
 * player opens it (`CORE.clientPhoneUsedEvent`, lib client `phone.onUsed`), and the server (`CORE.phoneOpenedEvent`,
 * which fires `CORE.phoneUsedEvent`). Once per opening, at most once per `USED_GAP_MS`.
 */
class PhoneUse {
  private readonly pick = new GlobalKey(CORE.phoneStateKey, stateString);
  private readonly layer = new AdapterFollower(
    ADAPTERS,
    this.pick,
    createLogger("ai-core"),
  );
  private last = -USED_GAP_MS;
  /** The polled phone's last open state; null until the first read after a switch (an open phone then is no opening). */
  private wasOpen: boolean | null = null;
  private readonly poll = every(1000, () => this.read(), {
    active: false,
    name: "phoneOpen",
  });

  constructor() {
    for (const adapter of ADAPTERS)
      adapter.watch?.(() => {
        if (this.layer.active === adapter) this.used(adapter.resource);
      });
    // The follower listens first, so its new pick is in place here.
    this.pick.onChange(() => this.follow());
    this.follow();
  }

  /** Phones with only an open-state export are read once a second while picked. */
  private follow(): void {
    this.wasOpen = null;
    this.poll.set(this.layer.active?.isOpen !== undefined);
  }

  private read(): void {
    const phone = this.layer.active;
    const open = this.layer.call("isOpen", (a) => a.isOpen?.() === true, false);
    if (phone && open && this.wasOpen === false) this.used(phone.resource);
    this.wasOpen = open;
  }

  private used(phone: string): void {
    const now = GetGameTimer();
    if (now - this.last < USED_GAP_MS) return;
    this.last = now;
    emit(CORE.clientPhoneUsedEvent, phone);
    emitNet(CORE.phoneOpenedEvent);
  }
}

new PhoneUse();
