/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
/**
	* Callback wire format, the same on both sides:
	*   request  `aicore:cb:<name>`              (callerResource, id, ...args)
	*   response `aicore:cbr:<callerResource>`   (id, ok, result)
	* The response goes only to the resource that asked, so two resources never see each other's replies.
	*/
	const requestEvent = (name) => `aicore:cb:${name}`;
	const responseEvent = (resource) => `aicore:cbr:${resource}`;
	/** Default time a caller waits for an answer before the promise rejects. */
	const DEFAULT_CALLBACK_TIMEOUT = 3e4;

// ../../../packages/lib/src/shared/wait.ts
/**
	* Resolves with the first value `check` returns that is not undefined, checking once per tick.
	* Rejects after `timeoutMs` (default 10 s); pass `false` to wait forever.
	* Return `cond || undefined` from `check` to wait for a truthy condition.
	*/
	function waitFor(check, timeoutMs = 1e4) {
		return new Promise((resolve, reject) => {
			const started = Date.now();
			const poll = () => {
				const value = check();
				if (value !== void 0) return resolve(value);
				if (timeoutMs !== false && Date.now() - started > timeoutMs) return reject(/* @__PURE__ */ new Error(`waitFor timed out after ${timeoutMs} ms`));
				setTimeout(poll, 0);
			};
			poll();
		});
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Client text made safe for the server console: one line, no control characters, no `^n` colour codes. */
	function logSafe(text, max) {
		return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** One parsed value as an `args` result: `[value]`, or null to refuse the call. */
	const asArgs = (value) => value === null ? null : [value];
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$7 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$7.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$7.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource$1 = GetCurrentResourceName();
	const log$6 = createLogger(resource$1);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource$1), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});
	/**
	* Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
	* parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
	*/
	function triggerServerCallback(name, args = [], timeoutMs = DEFAULT_CALLBACK_TIMEOUT) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(/* @__PURE__ */ new Error(`server callback ${name} timed out`));
			}, timeoutMs);
			pending.set(id, {
				resolve,
				reject,
				timer
			});
			emitNet(requestEvent(name), resource$1, id, ...args);
		});
	}

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		/** (resource: string | null) the inventory behind ai-core's inventory layer changed (the bridge drops its item cache). */
		inventoryChangedEvent: "ai-core:inventoryChanged",
		/** (src, name: string, status: Record<string, number> | null) a player used an item; status = the needs it gives, from inventories that define them. */
		itemUsedEvent: "ai-core:itemUsed",
		/** (src, killer: number | null, weaponHash: number) a player with a loaded character died; fired from FXServer's `onPedDeath` (needs `PED_DEATH_STATE_KEY`). */
		playerDiedEvent: "ai-core:playerDied",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (charId: number) ai-appearance holds this character's look: ai-core dresses its scene ped with `ApplyCharacterAppearance`. */
		clientCharacterLookEvent: "ai-core:client:characterLook",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (notification: Notification) a notification card on the player's screen. */
		clientNotifyEvent: "ai-core:client:notify",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};
	/** GlobalState key holding the resource name of the active inventory (null while none runs). */
	const INVENTORY_STATE_KEY = "ai:inventory";

// ../../../packages/shared/src/vehicleKeys.ts
/** GlobalState key holding the resource name of the active key system (null while none runs). */
	const VEHICLE_KEYS_STATE_KEY = "ai:vehicleKeys";
	/** Server -> client: ("give" | "remove", netId, plate) for key systems with a client API only. */
	const VEHICLE_KEYS_CLIENT_EVENT = "ai-core:client:vehicleKeys";

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		/** Callback: (keybinds: KeybindInfo[] the admin's client knows) -> AdminPanelSnapshot[]. */
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> client: () open the panel (the `aiadmin` command, checked on the server). */
		showEvent: "ai-core:admin:show",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
	};

// ../../../packages/shared/src/menu.ts
	const MENU_EVENTS = {
		/** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
		menuResult: "ai-core:client:menuResult",
		/** Client local: (resource, requestId, itemId) the pointer or focus is on an item (previews). */
		menuHover: "ai-core:client:menuHover",
		/** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
		inputResult: "ai-core:client:inputResult"
	};

// ../../../packages/shared/src/commands.ts
/** Client local events between the lib's `Keybind` and ai-core's client. */
	const KEYBIND = {
		/** lib -> ai-core: (info: KeybindInfo) a keybind waits for its default key. */
		announceEvent: "ai-core:client:keybind",
		/** ai-core -> lib: (resource, name, key) the default key to register: the panel's value, else the script's. */
		keyEvent: "ai-core:client:keybindKey"
	};

// ../../../packages/lib/src/client/adminWorld.ts
/**
	* The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
	* records changed since start (asked once), then live changes. Never polls.
	*/
	var AdminWorld = class {
		data = /* @__PURE__ */ new Map();
		handlers = /* @__PURE__ */ new Map();
		resource = GetCurrentResourceName();
		/** Resolves once the changes since start are applied (or could not be loaded): the data is current from then on. */
		ready;
		/** `files`: the world files this client mirrors (each must be in the resource's `files`). */
		constructor(files) {
			const log = createLogger(this.resource);
			for (const file of files) {
				const raw = LoadResourceFile(this.resource, `data/${file}.json`);
				try {
					const parsed = raw ? JSON.parse(raw) : {};
					this.data.set(file, isRecord(parsed) ? parsed : {});
				} catch (error) {
					log.error(`data/${file}.json is not valid JSON`, error);
					this.data.set(file, {});
				}
			}
			onServerEvent(ADMIN.worldEvent(this.resource), { args: ([file, key, value]) => typeof file === "string" ? [
				file,
				typeof key === "string" && key !== "" ? key : void 0,
				value
			] : null }, (file, key, value) => this.put(file, key, value));
			this.ready = triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then((changes) => {
				if (!isRecord(changes)) return;
				for (const [file, records] of Object.entries(changes)) {
					if (!isRecord(records)) continue;
					for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? void 0 : key, value);
				}
			}, (error) => log.error("loading the panel changes since start failed", error));
		}
		/** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
		get(file) {
			return this.data.get(file) ?? {};
		}
		onChange(file, handler) {
			this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
		}
		put(file, key, value) {
			const data = this.data.get(file);
			if (!data) return;
			if (key === void 0) {
				if (isRecord(value)) this.data.set(file, value);
			} else if (value === null) delete data[key];
			else data[key] = value;
			for (const handler of this.handlers.get(file) ?? []) handler(key, value);
		}
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return {
			vehicle: vehicle || false,
			seat,
			weapon: weapon === UNARMED ? false : weapon
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers$1 = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers$1.get(name) ?? []) handler(value, old);
	});

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log$5 = createLogger(GetCurrentResourceName());

// ../../../packages/lib/src/fivem/exports.ts
	function registerExport(name, handler) {
		globalThis.exports(name, handler);
	}
	/** Typed access to another resource's exports (types come from CitizenExports in @aicore-fivem/shared). */
	function resourceExport(resource) {
		return globalThis.exports[resource];
	}
	/** Whether a resource is running now. */
	function isResourceStarted(resource) {
		return GetResourceState(resource) === "started";
	}
	/** Another resource's exports while it runs, null when it does not (an optional dependency). */
	function optionalExport(resource) {
		return isResourceStarted(resource) ? globalThis.exports[resource] : null;
	}
	/** Calls an export of a resource whose exports have no type here (a third-party script); parse the result. */
	function callExport(resource, name, ...args) {
		const fn = Reflect.get(Object(globalThis.exports[resource]), name);
		if (typeof fn !== "function") throw new Error(`${resource} has no export ${name}`);
		return Reflect.apply(fn, void 0, args);
	}

// ../../../packages/lib/src/client/streaming.ts
/**
	* Loads a model and resolves with its hash. Rejects when the model does not exist or does not load in time.
	* Call `SetModelAsNoLongerNeeded(hash)` once the entity is created.
	*/
	async function requestModel(model, timeoutMs = 1e4) {
		const hash = typeof model === "number" ? model : GetHashKey(model);
		if (!IsModelInCdimage(hash)) throw new Error(`model ${model} does not exist`);
		RequestModel(hash);
		await waitFor(() => HasModelLoaded(hash) || void 0, timeoutMs);
		return hash;
	}
	/** Loads an animation dictionary. Call `RemoveAnimDict(dict)` when it is no longer played. */
	async function requestAnimDict(dict, timeoutMs = 1e4) {
		if (!DoesAnimDictExist(dict)) throw new Error(`anim dict ${dict} does not exist`);
		RequestAnimDict(dict);
		await waitFor(() => HasAnimDictLoaded(dict) || void 0, timeoutMs);
		return dict;
	}

// ../../../packages/lib/src/client/menu.ts
/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
	var Requests = class {
		resource = GetCurrentResourceName();
		waiting = /* @__PURE__ */ new Map();
		hovers = /* @__PURE__ */ new Map();
		nextId = 0;
		constructor() {
			const answer = (owner, id, value) => {
				if (owner !== this.resource || typeof id !== "number") return;
				this.waiting.get(id)?.(value);
				this.waiting.delete(id);
				this.hovers.delete(id);
			};
			on(MENU_EVENTS.menuHover, (owner, id, item) => {
				if (owner === this.resource && typeof id === "number" && typeof item === "string") this.hovers.get(id)?.(item);
			});
			on(MENU_EVENTS.menuResult, answer);
			on(MENU_EVENTS.inputResult, answer);
		}
		ask(open, read, onHover) {
			const id = ++this.nextId;
			this.waiting.set(id, read);
			if (onHover) this.hovers.set(id, onHover);
			open(id);
		}
	};
	const requests = new Requests();

// ../../../packages/lib/src/client/vehicleProps.ts
	const MOD_TYPES = Array.from({ length: 50 }, (_, i) => i);

// ../../../packages/lib/src/fivem/playerData.ts
/**
	* ai-core's per-player channel: the server pushes `(key, value)` of `AiPlayerData` to the owner's client. One net
	* event carries every key, and every resource on that client receives it, so client code subscribes per key
	* instead of wiring its own `onNet` for each value.
	*/
	const PLAYER_DATA_EVENT = "ai-core:client:playerData";
	/** Same channel for map values (money): only the changed entries travel and the client merges them. */
	const PLAYER_DATA_PATCH_EVENT = "ai-core:client:playerDataPatch";

// ../../../packages/lib/src/client/playerData.ts
	const values = /* @__PURE__ */ new Map();
	const handlers = /* @__PURE__ */ new Map();
	let listening$1 = false;
	function deliver(key, value) {
		values.set(key, value);
		for (const handler of handlers.get(key) ?? []) handler(value);
	}
	function listen() {
		if (listening$1) return;
		listening$1 = true;
		onServerEvent(PLAYER_DATA_EVENT, { args: ([key, value]) => typeof key === "string" ? [key, value] : null }, (key, value) => deliver(key, value));
		onServerEvent(PLAYER_DATA_PATCH_EVENT, { args: ([key, patch]) => typeof key === "string" && isRecord(patch) ? [key, patch] : null }, (key, patch) => {
			const current = values.get(key);
			deliver(key, {
				...isRecord(current) ? current : {},
				...patch
			});
		});
	}
	/**
	* Calls `handler` every time ai-core pushes `key` for this player. Returns an unsubscribe function. Values pushed
	* before this resource started are not replayed: read the current state once from ai-core's `GetPlayerData` export.
	*/
	function onPlayerData(key, handler) {
		listen();
		const set = handlers.get(key) ?? /* @__PURE__ */ new Set();
		set.add(handler);
		handlers.set(key, set);
		return () => set.delete(handler);
	}
	/** The last value pushed since this resource started, or undefined. */
	function getPlayerData(key) {
		listen();
		return values.get(key);
	}

// ../../../packages/lib/src/client/keybind.ts
	const resource = GetCurrentResourceName();
	/** Keybinds of this resource waiting for ai-core's answer (the panel's default key, else their own). */
	const waiting = /* @__PURE__ */ new Map();
	let listening = false;
	/** Asks ai-core's client for the default key (it knows the panel's keybind defaults); without ai-core the script's own. */
	function requestKey(info, apply) {
		if (resource !== CORE.resource && !isResourceStarted(CORE.resource)) return apply(info.defaultKey);
		if (!listening) {
			listening = true;
			on(KEYBIND.keyEvent, (owner, name, key) => {
				if (owner !== resource || typeof name !== "string" || typeof key !== "string") return;
				const done = waiting.get(name);
				waiting.delete(name);
				done?.(key);
			});
		}
		waiting.set(info.name, apply);
		emit(KEYBIND.announceEvent, info);
		setTimeout(() => {
			if (waiting.get(info.name) !== apply) return;
			waiting.delete(info.name);
			apply(info.defaultKey);
		}, 15e3);
	}
	/**
	* A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. The default key
	* comes from ai-core's admin panel when set there: the mapping command carries the key (`+<name>_<key>`), so a new
	* default makes a new mapping that every player gets. It is registered once ai-core answered (at start).
	*/
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash = 0;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			requestKey({
				resource,
				name: options.name,
				description: options.description,
				defaultKey: options.defaultKey ?? "",
				mapper: options.defaultMapper ?? "keyboard"
			}, (key) => this.register(key.toUpperCase()));
		}
		register(key) {
			const command = key ? `${this.name}_${key}` : this.name;
			this.hash = GetHashKey(`+${command}`) | 2147483648;
			RegisterCommand(`+${command}`, () => this.press(true), false);
			RegisterCommand(`-${command}`, () => this.press(false), false);
			RegisterKeyMapping(`+${command}`, this.options.description, this.options.defaultMapper ?? "keyboard", key);
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${command}`);
				emit("chat:removeSuggestion", `/-${command}`);
			}, 500);
		}
		press(down) {
			if (this.disabled || !this.options.allowInPauseMenu && IsPauseMenuActive()) return;
			this.pressed = down;
			if (down) this.options.onPressed?.();
			else this.options.onReleased?.();
		}
		/** Whether the key is held now. */
		get isPressed() {
			return this.pressed;
		}
		/** The key the player has bound right now, for HUD hints ("" until the mapping is registered). */
		get currentKey() {
			return this.hash ? GetControlInstructionalButton(0, this.hash, true).substring(2) : "";
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// resource/client/keybinds.ts
/**
	* Every resource's keybinds on this client (the lib's `Keybind` announces each one) and their default keys: the
	* panel's `keybinds` file (cached at start + changes since start) wins over the script's own key. Answered once the
	* file is current; a change made later applies when the script starts again or the player reconnects.
	*/
	var KeybindDefaults = class {
		known = /* @__PURE__ */ new Map();
		/** The key each keybind was answered with (later panel changes apply on its next start). */
		answered = /* @__PURE__ */ new Map();
		world = new AdminWorld(["keybinds"]);
		ready = false;
		constructor() {
			this.world.ready.then(() => {
				this.ready = true;
				for (const info of this.known.values()) this.answer(info);
			});
		}
		announce(info) {
			this.known.set(info.name, info);
			if (this.ready) this.answer(info);
		}
		/** A stopped resource's keybinds leave the list. */
		drop(resource) {
			for (const [name, info] of this.known) {
				if (info.resource !== resource) continue;
				this.known.delete(name);
				this.answered.delete(name);
			}
		}
		/** What the admin panel lists (sent when it opens). */
		list() {
			return [...this.known.values()];
		}
		/** The key a keybind was registered with (its mapping command is `+<name>_<key>`); null until answered. */
		keyOf(name) {
			return this.answered.get(name) ?? null;
		}
		answer(info) {
			const stored = this.world.get("keybinds")[info.name];
			const key = isRecord(stored) && typeof stored.key === "string" && stored.key !== "" ? stored.key.toUpperCase() : info.defaultKey;
			this.answered.set(info.name, key);
			emit(KEYBIND.keyEvent, info.resource, info.name, key);
		}
	};
	function toKeybindInfo(value) {
		if (!isRecord(value)) return null;
		const { resource, name, description, defaultKey, mapper } = value;
		if (typeof resource !== "string" || typeof name !== "string" || typeof description !== "string" || typeof defaultKey !== "string" || typeof mapper !== "string") return null;
		return {
			resource,
			name,
			description,
			defaultKey,
			mapper
		};
	}
	const keybinds = new KeybindDefaults();
	on(KEYBIND.announceEvent, (value) => {
		const info = toKeybindInfo(value);
		if (info) keybinds.announce(info);
	});
	on("onClientResourceStop", (resource) => keybinds.drop(resource));
	registerExport("GetKeybindKey", (name) => typeof name === "string" ? keybinds.keyOf(name) : null);

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/nui.ts
/** NUI contract of ai-core (client script <-> web), shared by both sides. */
	/** Client -> NUI messages: `{ action, data }`. */
	const NuiMessage = {
		/** data: { screen: CharacterScreen, texts, portraits, scene: boolean } (scene: the world scene stands behind the screen). */
		openCharacters: "openCharacters",
		closeCharacters: "closeCharacters",
		/** data: { id: number, url: string }, a character's portrait arrived (from an appearance resource). */
		portrait: "portrait",
		/** data: { panels: AdminPanelSnapshot[], texts }, the admin panel opens. */
		adminOpen: "adminOpen",
		/** data: AdminDelta, a record changed (by any admin or the script itself). */
		adminDelta: "adminDelta",
		/** data: { key, text, button }, a prompt appears (or its text changes) on the right. */
		promptShow: "promptShow",
		/** data: key */
		promptHide: "promptHide",
		/** data: Notification */
		notify: "notify",
		/** data: { label, duration }, the progress bar starts. */
		progressShow: "progressShow",
		progressHide: "progressHide",
		/** data: MenuRequest */
		menuOpen: "menuOpen",
		/** data: InputRequest */
		inputOpen: "inputOpen",
		dialogClose: "dialogClose"
	};
	/** NUI -> client callbacks (fetch `https://ai-core/<name>`), each answers `{ ok, error? }` or data. */
	const NuiCallback = {
		/** () -> open payload | null, the screen asks for its data once it is mounted. */
		ready: "ready",
		/** (CreateCharacterInput) -> CharacterActionResult */
		create: "create",
		/** (characterId) -> CharacterActionResult */
		select: "select",
		/** (characterId) -> true, the picked card changed: the scene camera moves to that character. */
		focus: "focus",
		/** (characterId) -> CharacterActionResult, then the screen is reloaded. */
		remove: "remove",
		/** ({ resource, patch }) -> AdminResult */
		adminApply: "adminApply",
		/** () -> true, the panel closed. */
		adminClose: "adminClose",
		/** ({ from: "ped" | "camera", ground?: boolean }) -> { x, y, z, heading }, the admin's position for a point field. */
		adminPosition: "adminPosition",
		/** ({ x, y, z, heading? }) -> true, teleports the admin to a point. */
		adminTeleport: "adminTeleport",
		/** ({ value }) -> true, the menu pick (item id) or input values; null when closed. */
		dialogAnswer: "dialogAnswer",
		/** ({ id }) -> true, the pointer or focus moved onto a menu item. */
		dialogHover: "dialogHover"
	};

// resource/client/playerState.ts
/**
	* The player's own data on this client, as ai-core pushed it (snapshot at load, then deltas). Other client
	* resources read it once with the `GetPlayerData` export and follow `onPlayerData` from the lib afterwards.
	*/
	let loaded = false;
	function snapshot() {
		const character = getPlayerData("character");
		if (!loaded || !character) return null;
		return {
			character,
			money: getPlayerData("money") ?? {},
			jobs: getPlayerData("jobs") ?? [],
			duty: getPlayerData("duty") ?? null,
			gangs: getPlayerData("gangs") ?? [],
			activeGang: getPlayerData("activeGang") ?? null
		};
	}
	/** Whether a character stands in the world on this client. */
	const isLoaded = () => loaded;
	/** Called once the character stands in the world: client scripts (and the bridges) start from here. */
	function announceLoaded() {
		loaded = true;
		emit(CORE.clientPlayerLoadedEvent, snapshot());
	}
	/** The character was let go (switch): client scripts drop their per-character state. */
	function announceUnloaded() {
		if (!loaded) return;
		loaded = false;
		emit(CORE.clientPlayerUnloadedEvent);
	}
	onPlayerData("character", () => void 0);
	registerExport("GetPlayerData", () => snapshot());
	registerExport("IsPlayerLoaded", () => loaded);

// resource/client/admin.ts
	const round = (value) => Math.round(value * 100) / 100;
	/** The admin panel on this client: opens it for admins (F10, or /aiadmin on the server), relays edits and the server's deltas. */
	var AdminPanelClient = class {
		open = false;
		opening = false;
		async show() {
			if (this.open || this.opening || !isLoaded()) return;
			this.opening = true;
			const panels = await triggerServerCallback(ADMIN.openCallback, [keybinds.list()]).catch(() => null);
			this.opening = false;
			if (!Array.isArray(panels)) return;
			this.open = true;
			SetNuiFocus(true, true);
			SendNUIMessage({
				action: NuiMessage.adminOpen,
				data: {
					panels,
					texts: loadLocaleTexts()
				}
			});
		}
		hide() {
			if (!this.open) return;
			this.open = false;
			SetNuiFocus(false, false);
			emitNet(ADMIN.closeEvent);
		}
		get isOpen() {
			return this.open;
		}
	};
	const panel = new AdminPanelClient();
	new Keybind({
		name: "aicore_admin",
		description: Locale("KEYBIND_ADMIN"),
		defaultKey: "F10",
		onPressed: () => void panel.show()
	});
	onServerEvent(ADMIN.showEvent, () => void panel.show());
	onServerEvent(ADMIN.deltaEvent, { args: ([delta]) => [delta] }, (delta) => {
		if (panel.isOpen) SendNUIMessage({
			action: NuiMessage.adminDelta,
			data: delta
		});
	});
	RegisterNuiCallback(NuiCallback.adminApply, (data, cb) => {
		if (!isRecord(data)) return cb({
			ok: false,
			error: "ADMIN_ERR_TYPE"
		});
		triggerServerCallback(ADMIN.applyCallback, [data.resource, data.patch]).then(cb, () => cb({
			ok: false,
			error: "ADMIN_ERR_BUSY"
		}));
	});
	RegisterNuiCallback(NuiCallback.adminClose, (_data, cb) => {
		panel.hide();
		cb(true);
	});
	RegisterNuiCallback(NuiCallback.adminPosition, (data, cb) => {
		const camera = isRecord(data) && data.from === "camera";
		const ground = isRecord(data) && data.ground === true;
		const ped = PlayerPedId();
		const [x = 0, y = 0, root = 0] = camera ? GetFinalRenderedCamCoord() : GetEntityCoords(ped, false);
		const z = ground && !camera ? root - GetEntityHeightAboveGround(ped) : root;
		const heading = camera ? GetFinalRenderedCamRot(2)[2] ?? 0 : GetEntityHeading(ped);
		cb({
			x: round(x),
			y: round(y),
			z: round(z),
			heading: round((heading % 360 + 360) % 360)
		});
	});
	RegisterNuiCallback(NuiCallback.adminTeleport, (data, cb) => {
		if (isRecord(data) && typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number") {
			const ped = PlayerPedId();
			RequestCollisionAtCoord(data.x, data.y, data.z);
			SetEntityCoordsNoOffset(ped, data.x, data.y, data.z, false, false, false);
			if (typeof data.heading === "number") SetEntityHeading(ped, data.heading);
		}
		cb(true);
	});

// resource/client/cacheWatch.ts
/** How often the player's ped, vehicle, seat and weapon are read (ox_lib uses the same 100 ms). */
	const INTERVAL = 100;
	/**
	* The one watcher behind every resource's lib `cache`: reads the local player's often used values ten times a
	* second and sends a local event only for a value that changed. Resources never poll these themselves.
	*/
	var CacheWatch = class {
		last = { ...cache };
		check() {
			const ped = PlayerPedId();
			this.put("ped", ped);
			const state = readPlayerState(ped);
			this.put("vehicle", state.vehicle);
			this.put("seat", state.seat);
			this.put("weapon", state.weapon);
		}
		put(key, value) {
			if (this.last[key] === value) return;
			this.last[key] = value;
			emit(CORE.clientCacheEvent, key, value);
		}
	};
	const watch = new CacheWatch();
	setInterval(() => watch.check(), INTERVAL);

// resource/client/prompts.ts
/**
	* The prompts on the right of the screen ("[E] Browse the clothing store"), shown and hidden by any resource. One
	* rebindable interaction key acts on a focused ai-target marker first, else on the prompt on top (the last one
	* shown) and tells its resource; nobody polls keys per frame.
	*/
	var Prompts = class {
		list = /* @__PURE__ */ new Map();
		key = new Keybind({
			name: "aicore_interact",
			description: Locale("KEYBIND_INTERACT"),
			defaultKey: "E",
			onPressed: () => this.press()
		});
		show(resource, id, text) {
			const key = `${resource}:${id}`;
			this.list.delete(key);
			this.list.set(key, {
				resource,
				id
			});
			const label = this.key.currentKey;
			SendNUIMessage({
				action: NuiMessage.promptShow,
				data: {
					key,
					text: logSafe(text, 120),
					button: /^[\w]{1,6}$/.test(label) ? label : "E"
				}
			});
		}
		hide(resource, id) {
			const key = `${resource}:${id}`;
			if (!this.list.delete(key)) return;
			SendNUIMessage({
				action: NuiMessage.promptHide,
				data: key
			});
		}
		/** A stopped resource takes its prompts with it. */
		drop(resource) {
			for (const prompt of this.list.values()) if (prompt.resource === resource) this.hide(resource, prompt.id);
		}
		press() {
			if (IsNuiFocused() || IsPauseMenuActive()) return;
			if (optionalExport("ai-target")?.HandleInteract() === true) return;
			const top = [...this.list.values()].at(-1);
			if (top) emit(CORE.clientPromptPressedEvent, top.resource, top.id);
		}
	};
	const prompts = new Prompts();
	registerExport("ShowPrompt", (id, text) => {
		if (typeof id === "string" && typeof text === "string") prompts.show(GetInvokingResource() || ResourceName, id, text);
	});
	registerExport("HidePrompt", (id) => {
		if (typeof id === "string") prompts.hide(GetInvokingResource() || ResourceName, id);
	});
	on("onClientResourceStop", (resource) => prompts.drop(resource));

// resource/client/notify.ts
	const KINDS = [
		"success",
		"error",
		"info",
		"warning"
	];
	function toNotification(v) {
		if (typeof v !== "object" || v === null || !("text" in v) || typeof v.text !== "string") return null;
		const kind = "kind" in v && KINDS.includes(v.kind) ? v.kind : "info";
		const title = "title" in v && typeof v.title === "string" ? logSafe(v.title, 60) : void 0;
		const duration = "duration" in v && typeof v.duration === "number" ? Math.min(3e4, Math.max(1e3, v.duration)) : 4e3;
		return {
			text: logSafe(v.text, 300),
			title,
			kind,
			duration
		};
	}
	/** Notification cards and the progress bar for every resource (lib `notify` / `progress`); ai-core only draws them. */
	const show = (n) => n && SendNUIMessage({
		action: NuiMessage.notify,
		data: n
	});
	registerExport("Notify", (n) => show(toNotification(n)));
	onServerEvent(CORE.clientNotifyEvent, { args: ([n]) => asArgs(toNotification(n)) }, (n) => show(n));
	registerExport("ShowProgress", (label, duration) => {
		if (typeof label === "string" && typeof duration === "number") SendNUIMessage({
			action: NuiMessage.progressShow,
			data: {
				label: logSafe(label, 60),
				duration
			}
		});
	});
	registerExport("HideProgress", () => SendNUIMessage({ action: NuiMessage.progressHide }));

// resource/client/menu.ts
	const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	function toMenu(v) {
		if (!isObj(v) || typeof v.title !== "string" || !Array.isArray(v.items)) return null;
		const items = v.items.flatMap((i) => isObj(i) && typeof i.id === "string" && typeof i.label === "string" ? [{
			id: i.id,
			label: logSafe(i.label, 80),
			icon: typeof i.icon === "string" ? i.icon : void 0,
			description: typeof i.description === "string" ? logSafe(i.description, 160) : void 0,
			disabled: i.disabled === true
		}] : []);
		return {
			title: logSafe(v.title, 60),
			items: items.slice(0, 40)
		};
	}
	function toInput(v) {
		if (!isObj(v) || typeof v.title !== "string" || !Array.isArray(v.fields)) return null;
		const fields = v.fields.flatMap((f) => {
			if (!isObj(f) || typeof f.name !== "string" || typeof f.label !== "string") return [];
			const placeholder = typeof f.placeholder === "string" ? f.placeholder : void 0;
			if (f.type === "number") return [{
				name: f.name,
				label: f.label,
				type: "number",
				min: typeof f.min === "number" ? f.min : void 0,
				max: typeof f.max === "number" ? f.max : void 0,
				placeholder
			}];
			return [{
				name: f.name,
				label: f.label,
				type: "text",
				maxLength: typeof f.maxLength === "number" ? f.maxLength : 120,
				placeholder
			}];
		});
		return {
			title: logSafe(v.title, 60),
			fields: fields.slice(0, 8),
			confirm: typeof v.confirm === "string" ? logSafe(v.confirm, 30) : "OK"
		};
	}
	/**
	* The menu and input dialog every resource opens through lib `menu` / `input`: one at a time; opening a new one answers
	* the previous request with null. The answer goes back to the asking resource as a local event.
	*/
	var Dialogs = class {
		current = null;
		open(kind, resource, id, data) {
			this.answer(null);
			this.current = {
				kind,
				resource,
				id
			};
			SetNuiFocus(true, true);
			SendNUIMessage({
				action: kind === "menu" ? NuiMessage.menuOpen : NuiMessage.inputOpen,
				data
			});
		}
		answer(value) {
			const current = this.current;
			if (!current) return;
			this.current = null;
			SetNuiFocus(false, false);
			SendNUIMessage({ action: NuiMessage.dialogClose });
			emit(current.kind === "menu" ? MENU_EVENTS.menuResult : MENU_EVENTS.inputResult, current.resource, current.id, value);
		}
		hover(item) {
			if (this.current?.kind === "menu" && typeof item === "string") emit(MENU_EVENTS.menuHover, this.current.resource, this.current.id, item);
		}
		/** A stopped resource's open dialog closes with it. */
		drop(resource) {
			if (this.current?.resource === resource) this.answer(null);
		}
	};
	const dialogs = new Dialogs();
	registerExport("OpenMenu", (id, request) => {
		const menu = toMenu(request);
		if (typeof id === "number" && menu) dialogs.open("menu", GetInvokingResource() || ResourceName, id, menu);
	});
	registerExport("OpenInput", (id, request) => {
		const input = toInput(request);
		if (typeof id === "number" && input) dialogs.open("input", GetInvokingResource() || ResourceName, id, input);
	});
	RegisterNuiCallback(NuiCallback.dialogAnswer, (data, cb) => {
		dialogs.answer(isObj(data) ? data.value : null);
		cb(true);
	});
	RegisterNuiCallback(NuiCallback.dialogHover, (data, cb) => {
		dialogs.hover(isObj(data) ? data.id : null);
		cb(true);
	});
	on("onClientResourceStop", (resource) => dialogs.drop(resource));

// resource/client/inventory/adapters/ai-inventory.ts
/** ai-inventory's own client exports. */
	const aiInventory = {
		resource: "ai-inventory",
		openInventory: () => resourceExport("ai-inventory").OpenSelf(),
		hasItem: (item, count) => resourceExport("ai-inventory").HasItem(item, count) === true
	};

// resource/client/inventory/adapters/ox_inventory.ts
/** ox_inventory 2.48.1 (client.lua, modules/inventory/client.lua): `openInventory()` without a type opens the player's own. */
	const RESOURCE$2 = "ox_inventory";
	const oxInventory = {
		resource: RESOURCE$2,
		openInventory: () => void callExport(RESOURCE$2, "openInventory"),
		hasItem: (item, count) => {
			const have = callExport(RESOURCE$2, "GetItemCount", item);
			return typeof have === "number" && have >= count;
		}
	};

// resource/client/inventory/adapters/qb-inventory.ts
/** qb-inventory 2.2.3 (client/main.lua): the own inventory opens through its `inventory` command. */
	const RESOURCE$1 = "qb-inventory";
	const qbInventory = {
		resource: RESOURCE$1,
		openInventory: () => ExecuteCommand("inventory"),
		hasItem: (item, count) => callExport(RESOURCE$1, "HasItem", item, count) === true
	};

// resource/client/inventory/adapters/tgiann-inventory.ts
/** tgiann-inventory 2.4.1 (client/exports.lua): `OpenInventory()` without a type opens the player's own. */
	const RESOURCE = "tgiann-inventory";
	const tgiannInventory = {
		resource: RESOURCE,
		openInventory: () => void callExport(RESOURCE, "OpenInventory"),
		hasItem: (item, count) => callExport(RESOURCE, "HasItem", item, count) === true
	};

// resource/client/inventory/index.ts
	const log$4 = createLogger("ai-core");
	/** The client half of the inventory layer: follows the inventory the server picked (GlobalState). */
	var ClientInventory = class {
		adapters;
		current = null;
		constructor(adapters) {
			this.adapters = adapters;
		}
		set(resource) {
			this.current = this.adapters.find((a) => a.resource === resource) ?? null;
		}
		open() {
			this.run("openInventory", (a) => a.openInventory(), void 0);
		}
		has(item, count) {
			return this.run("hasItem", (a) => a.hasItem(item, count), false);
		}
		run(what, fn, fallback) {
			const adapter = this.current;
			if (!adapter) return fallback;
			try {
				return fn(adapter);
			} catch (error) {
				log$4.error(`${adapter.resource} ${what} failed`, error);
				return fallback;
			}
		}
	};
	const inventory = new ClientInventory([
		aiInventory,
		tgiannInventory,
		oxInventory,
		qbInventory
	]);
	inventory.set(GlobalState[INVENTORY_STATE_KEY]);
	AddStateBagChangeHandler(INVENTORY_STATE_KEY, "global", (_bag, _key, value) => inventory.set(value));
	registerExport("OpenInventory", () => inventory.open());
	registerExport("HasItem", (item, count) => typeof item === "string" && inventory.has(item, typeof count === "number" && count > 0 ? count : 1));

// resource/client/vehicleKeys/index.ts
	const log$3 = createLogger("ai-core");
	/** Key systems with only a client API, one adapter file each (server list: `server/vehicleKeys/registry.ts`). */
	const ADAPTERS = [];
	/** The client half of the vehicle key layer: follows the key system the server picked (GlobalState). */
	var ClientKeys = class {
		current = null;
		pick(resource) {
			this.current = ADAPTERS.find((a) => a.resource === resource) ?? null;
		}
		async apply(action, netId, plate) {
			const adapter = this.current;
			if (!adapter) return;
			const vehicle = await waitFor(() => NetworkDoesEntityExistWithNetworkId(netId) ? NetToVeh(netId) : void 0, 5e3).catch(() => 0);
			if (!vehicle) return;
			try {
				adapter[action](vehicle, plate);
			} catch (error) {
				log$3.error(`${adapter.resource} ${action} key failed`, error);
			}
		}
	};
	const keys = new ClientKeys();
	keys.pick(GlobalState[VEHICLE_KEYS_STATE_KEY]);
	AddStateBagChangeHandler(VEHICLE_KEYS_STATE_KEY, "global", (_bag, _key, value) => keys.pick(value));
	onServerEvent(VEHICLE_KEYS_CLIENT_EVENT, { args: ([action, netId, plate]) => (action === "give" || action === "remove") && typeof netId === "number" && typeof plate === "string" ? [
		action,
		netId,
		plate
	] : null }, (action, netId, plate) => keys.apply(action, netId, plate));

// resource/client/sceneCamera.ts
	const MOVE_MS = 500;
	const SWAY_MS = 1e4;
	const SHAKE = .15;
	const RAD = Math.PI / 180;
	/** Camera position for a spot seen from `heading` (degrees): in front of that heading, raised by the height slope. */
	function cameraAt(spot, heading) {
		const pitch = Math.atan(spot.camHeight);
		const flat = spot.camDistance * Math.cos(pitch);
		return [
			spot.ped.x - Math.sin(heading * RAD) * flat,
			spot.ped.y + Math.cos(heading * RAD) * flat,
			spot.ped.z + spot.targetHeight + spot.camDistance * Math.sin(pitch)
		];
	}
	/**
	* The character screen camera: frames one spot, glides to another when the pick changes, sways slowly, and blurs
	* the background when the spot asks for it. Each move is a new camera interpolated from the old one.
	*/
	var SceneCamera = class {
		camera = null;
		/** Cameras still interpolating away; destroyed after the move or on `destroy`. */
		retired = /* @__PURE__ */ new Set();
		sway = null;
		dofTick = null;
		/** Frames `spot` at once (`instant`) or with a short glide from the current shot. */
		frame(spot, fov, instant) {
			const base = spot.ped.heading + spot.camAngle;
			const [x, y, z] = cameraAt(spot, base);
			const cam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", x, y, z, 0, 0, 0, fov, false, 2);
			PointCamAtCoord(cam, spot.ped.x, spot.ped.y, spot.ped.z + spot.targetHeight);
			ShakeCam(cam, "HAND_SHAKE", SHAKE);
			this.blur(cam, spot);
			const old = this.camera;
			this.camera = cam;
			if (old === null || instant) {
				if (old !== null) DestroyCam(old, false);
				SetCamActive(cam, true);
				RenderScriptCams(true, false, 0, true, true);
			} else {
				SetCamActiveWithInterp(cam, old, MOVE_MS, 1, 1);
				this.retired.add(old);
				setTimeout(() => {
					if (this.retired.delete(old)) DestroyCam(old, false);
				}, 650);
			}
			SetFocusPosAndVel(x, y, z, 0, 0, 0);
			this.startSway(spot, fov, base, instant ? 0 : MOVE_MS);
		}
		/** Swings the camera between base ± sway, one side per SWAY_MS (the game interpolates each leg). */
		startSway(spot, fov, base, delay) {
			this.stopSway();
			if (spot.sway <= 0) return;
			let side = 1;
			const leg = () => {
				if (this.camera === null) return;
				const [x, y, z] = cameraAt(spot, base + side * spot.sway);
				SetCamParams(this.camera, x, y, z, 0, 0, 0, fov, SWAY_MS, 0, 0, 2);
				SetFocusPosAndVel(x, y, z, 0, 0, 0);
				side = -side;
				this.sway = setTimeout(leg, SWAY_MS);
			};
			this.sway = setTimeout(leg, delay);
		}
		stopSway() {
			if (this.sway !== null) clearTimeout(this.sway);
			this.sway = null;
		}
		/** Depth of field needs `SetUseHiDof` every frame, so the tick runs only while a blurred spot is framed. */
		blur(cam, spot) {
			SetCamUseShallowDofMode(cam, spot.blur);
			if (spot.blur) {
				SetCamNearDof(cam, spot.blurNear);
				SetCamFarDof(cam, spot.blurFar);
				SetCamDofStrength(cam, spot.blurStrength / 100);
				this.dofTick ??= setTick(() => SetUseHiDof());
			} else if (this.dofTick !== null) {
				clearTick(this.dofTick);
				this.dofTick = null;
			}
		}
		destroy() {
			this.stopSway();
			if (this.dofTick !== null) clearTick(this.dofTick);
			this.dofTick = null;
			if (this.camera === null) return;
			RenderScriptCams(false, false, 0, true, true);
			DestroyCam(this.camera, false);
			for (const cam of this.retired) DestroyCam(cam, false);
			this.retired.clear();
			this.camera = null;
			ClearFocus();
		}
	};

// resource/client/scene.ts
	const log$2 = createLogger("ai-core");
	const MODELS = {
		male: "mp_m_freemode_01",
		female: "mp_f_freemode_01"
	};
	/** The weather sync pause contract (qb-weathersync's client events, answered by ai-weathersync). */
	const SYNC_OFF = "qb-weathersync:client:DisableSync";
	const SYNC_ON = "qb-weathersync:client:EnableSync";
	/** Swaps the player's model (freemode by sex) and resets its clothing to the defaults. */
	async function setPlayerModel(model) {
		const hash = await requestModel(model);
		if (GetEntityModel(PlayerPedId()) !== hash) {
			SetPlayerModel(PlayerId(), hash);
			SetPedDefaultComponentVariation(PlayerPedId());
		}
		SetModelAsNoLongerNeeded(hash);
	}
	/** Waits (at most a few seconds) for the map around the ped to load, so it does not fall through. */
	async function waitForGround() {
		await waitFor(() => HasCollisionLoadedAroundEntity(PlayerPedId()) || void 0, 5e3).catch(() => void 0);
	}
	/**
	* The world behind the character screen: the player's characters stand on the scene's spots as local peds in their
	* saved look (ai-appearance, when it runs), the camera frames the picked one. The player itself waits hidden.
	*/
	var SelectScene = class {
		scene = null;
		characters = [];
		focused = null;
		/** Character id -> its ped and the spot index it stands on. */
		peds = /* @__PURE__ */ new Map();
		camera = new SceneCamera();
		queue = Promise.resolve();
		/** Raised by `leave`: ped creation still loading for an older scene drops its ped. */
		generation = 0;
		timeForced = false;
		/** Builds the scene behind a black screen, focused on the first character, then fades in. */
		async enter(scene, characters) {
			DoScreenFadeOut(0);
			this.leave();
			this.scene = scene;
			this.characters = characters;
			this.focused = characters[0]?.id ?? null;
			try {
				const spot = this.focusSpot(scene);
				if (!spot) throw new Error("the character scene has no spots");
				await setPlayerModel(MODELS.male);
				this.hidePlayer(spot);
				this.forceTime(scene.time);
				this.camera.frame(spot, scene.fov, true);
				await waitForGround();
				await this.sync();
			} finally {
				ShutdownLoadingScreen();
				ShutdownLoadingScreenNui();
				DisplayRadar(false);
				DoScreenFadeIn(500);
			}
		}
		/** The list changed (a character was deleted): focus the first one and bring the peds in line. */
		async setCharacters(characters) {
			const scene = this.scene;
			if (!scene) return;
			this.characters = characters;
			this.focused = characters[0]?.id ?? null;
			const spot = this.focusSpot(scene);
			if (spot) this.camera.frame(spot, scene.fov, false);
			await this.sync();
		}
		/** The player picked another character: the camera glides to it (a character without its own spot steps in first). */
		focus(id) {
			const scene = this.scene;
			if (!scene || id === this.focused || !this.characters.some((c) => c.id === id)) return;
			this.focused = id;
			this.sync();
			const spot = this.focusSpot(scene);
			if (spot) this.camera.frame(spot, scene.fov, false);
		}
		/** Puts a character's saved look on its ped (the look arrives from ai-appearance, possibly after the ped). */
		dress(id) {
			const entry = this.peds.get(id);
			if (entry) optionalExport("ai-appearance")?.ApplyCharacterAppearance(entry.ped, id);
		}
		/** Deletes the peds, drops the camera and gives time and weather back to the sync. */
		leave() {
			this.generation++;
			for (const { ped } of this.peds.values()) DeletePed(ped);
			this.peds.clear();
			this.camera.destroy();
			this.restoreTime();
			this.scene = null;
			this.characters = [];
			this.focused = null;
		}
		/** Spot index per shown character: slot N stands on spot N; a picked character past the spots borrows spot (slot - 1) % count. */
		placement(count) {
			const out = /* @__PURE__ */ new Map();
			const picked = this.characters.find((c) => c.id === this.focused);
			const borrowed = picked && picked.slot > count ? (picked.slot - 1) % count : -1;
			for (const c of this.characters) if (c.slot <= count && c.slot - 1 !== borrowed) out.set(c.id, c.slot - 1);
			if (picked && borrowed >= 0) out.set(picked.id, borrowed);
			return out;
		}
		focusSpot(scene) {
			const index = this.focused === null ? 0 : this.placement(scene.spots.length).get(this.focused) ?? 0;
			return scene.spots[index];
		}
		/** Serialized, so overlapping calls never create a character's ped twice. */
		sync() {
			const generation = this.generation;
			this.queue = this.queue.then(() => this.syncNow(generation)).catch((error) => log$2.error("character scene peds failed", error));
			return this.queue;
		}
		async syncNow(generation) {
			const scene = this.scene;
			if (!scene || generation !== this.generation) return;
			const placement = this.placement(scene.spots.length);
			for (const [id, entry] of this.peds) {
				if (placement.get(id) === entry.spot) continue;
				DeletePed(entry.ped);
				this.peds.delete(id);
			}
			for (const [id, index] of placement) {
				const card = this.characters.find((c) => c.id === id);
				const spot = scene.spots[index];
				if (this.peds.has(id) || !card || !spot) continue;
				const ped = await this.createPed(card.sex, spot);
				if (generation !== this.generation) return DeletePed(ped);
				this.peds.set(id, {
					ped,
					spot: index
				});
				this.dress(id);
			}
		}
		/** A local (not networked) frozen ped on the spot, default freemode clothes, playing the spot's idle. */
		async createPed(sex, spot) {
			const hash = await requestModel(MODELS[sex]);
			const { x, y, z, heading } = spot.ped;
			const ped = CreatePed(4, hash, x, y, z, heading, false, false);
			SetModelAsNoLongerNeeded(hash);
			SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
			FreezeEntityPosition(ped, true);
			SetEntityInvincible(ped, true);
			SetBlockingOfNonTemporaryEvents(ped, true);
			SetPedDefaultComponentVariation(ped);
			if (spot.anim && spot.clip) {
				if (await requestAnimDict(spot.anim).then(() => true, (error) => (log$2.warn(`scene animation ${spot.anim} did not load`, error), false))) {
					TaskPlayAnim(ped, spot.anim, spot.clip, 8, 8, -1, 1, 0, false, false, false);
					RemoveAnimDict(spot.anim);
				}
			}
			return ped;
		}
		/** The player waits invisible and frozen under the focused spot, so the area's collision and map stream in. */
		hidePlayer(spot) {
			const { x, y, heading } = spot.ped;
			const z = spot.ped.z - 5;
			RequestCollisionAtCoord(x, y, z);
			NetworkResurrectLocalPlayer(x, y, z, heading, 0, false);
			const ped = PlayerPedId();
			SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
			FreezeEntityPosition(ped, true);
			SetEntityInvincible(ped, true);
			SetEntityVisible(ped, false, false);
		}
		forceTime(time) {
			if (!time.enabled) return;
			emit(SYNC_OFF);
			NetworkOverrideClockTime(time.hour, time.minute, 0);
			SetOverrideWeather(time.weather);
			this.timeForced = true;
		}
		restoreTime() {
			if (!this.timeForced) return;
			this.timeForced = false;
			ClearOverrideWeather();
			NetworkClearClockTimeOverride();
			emit(SYNC_ON);
		}
	};

// resource/client/characters.ts
	const log$1 = createLogger("ai-core");
	const scene = new SelectScene();
	const BUSY = {
		ok: false,
		error: "CHAR_ERR_BUSY"
	};
	let screen = null;
	/** Portraits an appearance resource made for the cards, by character id; kept until a character spawns. */
	let portraits = {};
	/** Whether the in-world scene stands behind the screen (false: the NUI shows its background picture). */
	let sceneLive = false;
	/** Answers of the server are unknown: this is the only shape the screen accepts. */
	function toResult(value) {
		if (isRecord(value) && value.ok === true) return { ok: true };
		if (isRecord(value) && typeof value.error === "string") return {
			ok: false,
			error: value.error
		};
		return BUSY;
	}
	async function loadScreen() {
		const answer = await triggerServerCallback(CORE.charactersCallback).catch(() => null);
		screen = isRecord(answer) && Array.isArray(answer.characters) && isRecord(answer.scene) && Array.isArray(answer.scene.spots) ? answer : null;
		return screen;
	}
	const openPayload = (data) => ({
		screen: data,
		texts: loadLocaleTexts(),
		portraits,
		scene: sceneLive
	});
	/** Puts the player on the character screen: scene with the characters, camera, NUI with focus. */
	async function openCharacters() {
		const data = await loadScreen();
		if (!data) return;
		sceneLive = await scene.enter(data.scene, data.characters).then(() => true, (error) => {
			log$1.error("building the character scene failed", error);
			scene.leave();
			return false;
		});
		SetNuiFocus(true, true);
		SendNUIMessage({
			action: NuiMessage.openCharacters,
			data: openPayload(data)
		});
	}
	function closeCharacters() {
		SetNuiFocus(false, false);
		SendNUIMessage({ action: NuiMessage.closeCharacters });
	}
	RegisterNuiCallback(NuiCallback.ready, (_data, cb) => cb(screen ? openPayload(screen) : null));
	RegisterNuiCallback(NuiCallback.focus, (id, cb) => {
		if (typeof id === "number") scene.focus(id);
		cb(true);
	});
	on(CORE.clientCharacterLookEvent, (id) => {
		if (typeof id === "number") scene.dress(id);
	});
	on("onResourceStop", (resource) => {
		if (resource === ResourceName) scene.leave();
	});
	on(CORE.clientCharacterPortraitEvent, (id, url) => {
		if (typeof id !== "number" || typeof url !== "string" || !url.startsWith("https://nui-img/")) return;
		portraits[id] = url;
		SendNUIMessage({
			action: NuiMessage.portrait,
			data: {
				id,
				url
			}
		});
	});
	function serverAction(callback) {
		return (data, cb) => {
			triggerServerCallback(callback, [data]).then((answer) => cb(toResult(answer)), () => cb(BUSY));
		};
	}
	RegisterNuiCallback(NuiCallback.create, serverAction(CORE.createCharacterCallback));
	RegisterNuiCallback(NuiCallback.select, serverAction(CORE.selectCharacterCallback));
	RegisterNuiCallback(NuiCallback.remove, (data, cb) => {
		triggerServerCallback(CORE.deleteCharacterCallback, [data]).then(async (answer) => {
			const result = toResult(answer);
			if (!result.ok) return cb(result);
			const next = await loadScreen();
			if (next) await scene.setCharacters(next.characters);
			cb({
				ok: true,
				screen: next
			});
		}, () => cb(BUSY));
	});
	/** The server loaded a character: out of the screen and into the world at its spawn. */
	/** The spawn point the server sends: finite coordinates and a model name. */
	function toSpawn(value) {
		if (!isRecord(value) || typeof value.model !== "string") return null;
		const { x, y, z, heading } = value;
		const finite = (n) => typeof n === "number" && Number.isFinite(n);
		return finite(x) && finite(y) && finite(z) && finite(heading) ? [{
			x,
			y,
			z,
			heading,
			model: value.model
		}] : null;
	}
	onServerEvent(CORE.spawnEvent, { args: ([raw]) => toSpawn(raw) }, async (spawn) => {
		try {
			DoScreenFadeOut(300);
			await waitFor(() => IsScreenFadedOut() || void 0, 2e3).catch(() => void 0);
			closeCharacters();
			scene.leave();
			await setPlayerModel(spawn.model);
			RequestCollisionAtCoord(spawn.x, spawn.y, spawn.z);
			NetworkResurrectLocalPlayer(spawn.x, spawn.y, spawn.z, spawn.heading, 0, false);
			const ped = PlayerPedId();
			SetEntityCoordsNoOffset(ped, spawn.x, spawn.y, spawn.z, false, false, false);
			SetEntityHeading(ped, spawn.heading);
			await waitForGround();
			FreezeEntityPosition(ped, false);
			SetEntityInvincible(ped, false);
			SetEntityVisible(ped, true, false);
			DisplayRadar(true);
			DoScreenFadeIn(500);
			screen = null;
			portraits = {};
			announceLoaded();
		} catch (error) {
			log$1.error("spawn failed", error);
			DoScreenFadeIn(0);
		}
	});
	onServerEvent(CORE.openCharactersEvent, () => {
		openCharacters().catch((error) => log$1.error("opening the character screen failed", error));
	});

// resource/client/index.ts
	const log = createLogger("ai-core");
	/** No spawnmanager: ai-core takes the player from the loading screen to the character screen itself. */
	async function boot() {
		await waitFor(() => NetworkIsSessionStarted() || void 0, false);
		await openCharacters();
	}
	onServerEvent(CORE.openCharactersEvent, () => announceUnloaded());
	boot().catch((error) => log.error("boot failed", error));

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
