import type { Logger } from "@aicore-fivem/lib/shared";
import { guarded, type Adapter } from "./adapter";

/** A GlobalKey mirror holding the server's pick (client `GlobalKey<string>`). */
interface PickKey {
  get(): string | undefined;
  onChange(
    listener: (id: "global", value: string | undefined) => void,
  ): unknown;
}

/** Client half of a server-side picker: follows the adapter the server published in a GlobalKey. */
export class AdapterFollower<A extends Adapter> {
  private current: A | null = null;

  constructor(
    private readonly adapters: readonly A[],
    key: PickKey,
    private readonly log: Logger,
  ) {
    this.pick(key.get());
    key.onChange((_id, value) => this.pick(value));
  }

  get active(): A | null {
    return this.current;
  }

  /** Runs `fn` on the followed adapter; `fallback` while none is picked or when its resource throws. */
  call<T>(what: string, fn: (adapter: A) => T, fallback: T): T {
    return guarded(this.current, what, fn, fallback, this.log);
  }

  private pick(resource: string | undefined): void {
    this.current = this.adapters.find((a) => a.resource === resource) ?? null;
  }
}
