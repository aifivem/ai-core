import type { Player } from "./player"
import type { User } from "./users"

/** Every online player with a loaded character, by server id, character id and citizen id. */
class PlayerRegistry {
  private readonly bySource = new Map<number, Player>()
  private readonly byCharId = new Map<number, Player>()
  private readonly byCitizenId = new Map<string, Player>()

  add(player: Player): void {
    this.bySource.set(player.source, player)
    this.byCharId.set(player.charId, player)
    this.byCitizenId.set(player.citizenid, player)
  }

  remove(player: Player): void {
    this.bySource.delete(player.source)
    this.byCharId.delete(player.charId)
    this.byCitizenId.delete(player.citizenid)
  }

  get(source: number): Player | undefined {
    return this.bySource.get(source)
  }

  byCharacter(charId: number): Player | undefined {
    return this.byCharId.get(charId)
  }

  byCitizen(citizenid: string): Player | undefined {
    return this.byCitizenId.get(citizenid)
  }

  all(): IterableIterator<Player> {
    return this.bySource.values()
  }

  get size(): number {
    return this.bySource.size
  }
}

export const players = new PlayerRegistry()

/** Connected players without a loaded character (on the character screen), with their account. */
export const selecting = new Map<number, User>()
