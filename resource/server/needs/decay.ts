import { every } from "@aifivem/lib/server";
import { players } from "../player/registry";
import { stressRelief } from "../stress";
import { needsSettings, needsStore } from "./store";

/**
 * A minute of play for every loaded character: hunger and thirst drop by the panel's rates, stress fades by the
 * active HUD's relief. One pass a second over the loaded players takes the slice whose server id falls on that second
 * (60 slices), so the metadata writes of a full server spread over the minute instead of one frame.
 */
class NeedsDecay {
  private slice = 0;

  pass(): void {
    const slice = this.slice;
    this.slice = (slice + 1) % 60;
    const { decay } = needsSettings.value;
    let relief: number | undefined;
    for (const player of players.all()) {
      if (player.source % 60 !== slice) continue;
      if (decay.enabled) {
        needsStore.add(player, "hunger", -decay.hunger);
        needsStore.add(player, "thirst", -decay.thirst);
      }
      // Asked once per pass, only when the slice has someone.
      relief ??= stressRelief();
      if (relief > 0) needsStore.add(player, "stress", -relief);
    }
  }
}

const decay = new NeedsDecay();
every(1000, () => decay.pass(), { name: "needs" });
