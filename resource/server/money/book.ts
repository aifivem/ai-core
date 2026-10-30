import { mysql } from "@aicore-fivem/mysql"
import { accountTypes } from "../content"
import { Account, type OwnerType } from "./account"

interface AccountRow {
  id: number
  name: string
  balance: number | string
}

/**
 * Loads (and creates when missing) every account type of one owner. Character accounts start with the type's
 * starting amount; job and gang accounts start empty.
 */
export async function loadAccounts(
  ownerType: OwnerType,
  ownerId: string
): Promise<Map<string, Account>> {
  const select = async (): Promise<AccountRow[]> =>
    (await mysql.query<AccountRow[]>(
      "SELECT id, name, balance FROM ai_core_accounts WHERE owner_type = ? AND owner_id = ?",
      [ownerType, ownerId]
    )) ?? []
  // Read first: an owner seen before has every row, so a login writes nothing; only missing types are inserted.
  let rows = await select()
  const have = new Set(rows.map((row) => row.name))
  const missing = [...accountTypes.keys()].filter((name) => !have.has(name))
  if (missing.length > 0) {
    const values = missing.map((name) => [
      ownerType,
      ownerId,
      name,
      ownerType === "character" ? (accountTypes.get(name)?.start ?? 0) : 0,
    ])
    await mysql.query(
      `INSERT IGNORE INTO ai_core_accounts (owner_type, owner_id, name, balance) VALUES ${values.map(() => "(?, ?, ?, ?)").join(", ")}`,
      values.flat()
    )
    rows = await select()
  }

  const accounts = new Map<string, Account>()
  for (const row of rows) {
    const type = accountTypes.get(row.name)
    if (!type) continue
    accounts.set(
      row.name,
      new Account(
        row.id,
        ownerType,
        ownerId,
        row.name,
        Number(row.balance),
        type.allowNegative
      )
    )
  }
  return accounts
}

/** Job and gang accounts, loaded on first use and kept for the server's lifetime. */
class SharedAccounts {
  private readonly owners = new Map<string, Promise<Map<string, Account>>>()
  private readonly loaded = new Map<string, Map<string, Account>>()

  private key(ownerType: OwnerType, ownerId: string): string {
    return `${ownerType}:${ownerId}`
  }

  /** Loads an owner's accounts once (concurrent callers share the load). */
  load(
    ownerType: "job" | "gang",
    ownerId: string
  ): Promise<Map<string, Account>> {
    const key = this.key(ownerType, ownerId)
    let pending = this.owners.get(key)
    if (!pending) {
      pending = loadAccounts(ownerType, ownerId).then((accounts) => {
        this.loaded.set(key, accounts)
        return accounts
      })
      this.owners.set(key, pending)
    }
    return pending
  }

  /** The account when already loaded (synchronous callers: exports). */
  get(
    ownerType: "job" | "gang",
    ownerId: string,
    name: string
  ): Account | undefined {
    return this.loaded.get(this.key(ownerType, ownerId))?.get(name)
  }

  all(): Account[] {
    return [...this.loaded.values()].flatMap((accounts) => [
      ...accounts.values(),
    ])
  }
}

export const sharedAccounts = new SharedAccounts()
