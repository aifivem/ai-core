import { isResourceStarted } from "@aicore-fivem/lib/fivem";
import type { Logger } from "@aicore-fivem/lib/shared";

/** What every integration adapter has: the resource it talks to and, optionally, the version it is written for. */
interface Adapter {
  readonly resource: string;
  readonly version?: string;
}

/** Runs before the first switch and after every one; `restarted` = the same adapter whose resource started again. */
export type SwitchHandler<A> = (
  next: A | null,
  previous: A | null,
  restarted: boolean,
) => void;

export interface AdapterPickerOptions<A extends Adapter> {
  /** Log text: "vehicle keys", "dispatch"... */
  category: string;
  /** Detection order: `auto` uses the first one running. */
  adapters: readonly A[];
  log: Logger;
  /** `auto` (default) or one adapter's resource name (the panel setting). */
  choice?: string;
  /** Registered before the first pick, so it sees it (publish the pick, hand over kept registrations). */
  onSwitch?: SwitchHandler<A>;
  /** Logged when none runs in `auto`. */
  noneText?: string;
}

/** The resource names a resource stands in for (its `provide` lines). */
function provides(resource: string): string[] {
  return Array.from(
    { length: GetNumResourceMetadata(resource, "provide") },
    (_, i) => GetResourceMetadata(resource, "provide", i),
  );
}

/** Runs `fn` on an adapter; logs and answers `fallback` when there is none or its resource throws. */
function guarded<A extends Adapter, T>(
  adapter: A | null,
  what: string,
  fn: (adapter: A) => T,
  fallback: T,
  log: Logger,
): T {
  if (!adapter) return fallback;
  try {
    return fn(adapter);
  } catch (error) {
    log.error(`${adapter.resource} ${what} failed`, error);
    return fallback;
  }
}

/**
 * The active adapter of one integration category: the panel's choice or the first running one in list order, picked
 * again when a candidate (or a resource `provide`ing one) starts or stops. A stopping resource and the names it
 * `provide`s count as stopped from its stop event until it starts again (they still read started while it stops).
 * Works on both sides.
 */
export class AdapterPicker<A extends Adapter> {
  private current: A | null = null;
  private choice: string;
  private readonly down = new Set<string>();
  private readonly names: ReadonlySet<string>;
  private readonly handlers: SwitchHandler<A>[] = [];

  constructor(private readonly options: AdapterPickerOptions<A>) {
    this.choice = options.choice ?? "auto";
    this.names = new Set(options.adapters.map((a) => a.resource));
    if (options.onSwitch) this.handlers.push(options.onSwitch);
    const started = IsDuplicityVersion()
      ? "onServerResourceStart"
      : "onClientResourceStart";
    on(started, (resource: string) => this.started(resource));
    on("onResourceStop", (resource: string) => this.stopped(resource));
    this.select();
  }

  get active(): A | null {
    return this.current;
  }

  /** `auto`, or the resource name of one adapter. */
  setChoice(choice: string): void {
    if (choice === this.choice) return;
    this.choice = choice;
    this.select();
  }

  onSwitch(handler: SwitchHandler<A>): void {
    this.handlers.push(handler);
  }

  /** Whether a resource runs and is not on its way down. */
  runs(resource: string): boolean {
    return !this.down.has(resource) && isResourceStarted(resource);
  }

  /** Runs `fn` on the active adapter; `fallback` while none runs or when its resource throws. */
  call<T>(what: string, fn: (adapter: A) => T, fallback: T): T {
    return guarded(this.current, what, fn, fallback, this.options.log);
  }

  private started(resource: string): void {
    const names = [resource, ...provides(resource)];
    for (const name of names) this.down.delete(name);
    if (names.some((name) => this.names.has(name))) this.select(names);
  }

  private stopped(resource: string): void {
    const names = [resource, ...provides(resource)];
    if (!names.some((name) => this.names.has(name))) return;
    for (const name of names) this.down.add(name);
    this.select();
  }

  /** Picks again; `restarted` are names that just started (the same adapter then hands its state over again). */
  private select(restarted?: readonly string[]): void {
    const { adapters, category, log } = this.options;
    const auto =
      this.choice === "auto" ||
      !adapters.some((a) => a.resource === this.choice);
    const next =
      adapters.find(
        (a) => (auto || a.resource === this.choice) && this.runs(a.resource),
      ) ?? null;
    const previous = this.current;
    const again =
      next !== null &&
      next === previous &&
      !!restarted?.includes(next.resource);
    if (next === previous && !again) return;
    this.current = next;
    if (next !== previous) this.report(next, auto);
    for (const handler of this.handlers)
      guarded(
        next ?? previous,
        `${category} switch`,
        () => handler(next, previous, again),
        undefined,
        log,
      );
  }

  private report(next: A | null, auto: boolean): void {
    const { category, log, noneText } = this.options;
    if (!next) {
      log.info(
        auto
          ? (noneText ?? `no ${category} runs`)
          : `the ${category} picked in the panel (${this.choice}) does not run`,
      );
      return;
    }
    const installed = GetResourceMetadata(next.resource, "version", 0) || "?";
    log.info(`${category}: ${next.resource} ${installed}`);
    if (next.version && installed !== next.version)
      log.warn(
        `${next.resource} ${installed} is installed; its adapter is written for ${next.version}`,
      );
  }
}

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
