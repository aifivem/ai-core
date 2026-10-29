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
	const log$4 = createLogger(GetCurrentResourceName());
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
			if (!args) return log$4.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$4.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource = GetCurrentResourceName();
	const log$3 = createLogger(resource);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource), (id, ok, result) => {
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
			emitNet(requestEvent(name), resource, id, ...args);
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
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
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
	const log$2 = createLogger(GetCurrentResourceName());

// ../../../packages/lib/src/fivem/exports.ts
	function registerExport(name, handler) {
		globalThis.exports(name, handler);
	}
	/** Whether a resource is running now. */
	function isResourceStarted(resource) {
		return GetResourceState(resource) === "started";
	}
	/** Another resource's exports while it runs, null when it does not (an optional dependency). */
	function optionalExport(resource) {
		return isResourceStarted(resource) ? globalThis.exports[resource] : null;
	}

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
	let listening = false;
	function deliver(key, value) {
		values.set(key, value);
		for (const handler of handlers.get(key) ?? []) handler(value);
	}
	function listen() {
		if (listening) return;
		listening = true;
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
/** A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. */
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			this.hash = GetHashKey(`+${options.name}`) | 2147483648;
			RegisterCommand(`+${options.name}`, () => this.press(true), false);
			RegisterCommand(`-${options.name}`, () => this.press(false), false);
			RegisterKeyMapping(`+${options.name}`, options.description, options.defaultMapper ?? "keyboard", options.defaultKey ?? "");
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${options.name}`);
				emit("chat:removeSuggestion", `/-${options.name}`);
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
		/** The key the player has bound right now, for HUD hints. */
		get currentKey() {
			return GetControlInstructionalButton(0, this.hash, true).substring(2);
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

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

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/utils.ts
	function LoadFile(path) {
		path = path.replace("public/", "dist/");
		const file = LoadResourceFile(ResourceName, path);
		if (!file) throw new Error(`Failed to load file "${path}" (file not found)`);
		switch (path.slice(path.lastIndexOf(".") + 1)) {
			case "js": return new Function(file)();
			case "json": return JSON.parse(file);
		}
		throw new Error(`Failed to load file "${path}" (invalid extension type)`);
	}

// resource/common/config.ts
	const Config = LoadFile("public/config.json");

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/nui.ts
/** NUI contract of ai-core (client script <-> web), shared by both sides. */
	/** Client -> NUI messages: `{ action, data }`. */
	const NuiMessage = {
		/** data: CharacterScreen */
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
		promptHide: "promptHide"
	};
	/** NUI -> client callbacks (fetch `https://ai-core/<name>`), each answers `{ ok, error? }` or data. */
	const NuiCallback = {
		/** () -> CharacterScreen | null, the screen asks for its data once it is mounted. */
		ready: "ready",
		/** (CreateCharacterInput) -> CharacterActionResult */
		create: "create",
		/** (characterId) -> CharacterActionResult */
		select: "select",
		/** (characterId) -> CharacterActionResult, then the screen is reloaded. */
		remove: "remove",
		/** ({ resource, patch }) -> AdminResult */
		adminApply: "adminApply",
		/** () -> true, the panel closed. */
		adminClose: "adminClose",
		/** ({ from: "ped" | "camera", ground?: boolean }) -> { x, y, z, heading }, the admin's position for a point field. */
		adminPosition: "adminPosition",
		/** ({ x, y, z, heading? }) -> true, teleports the admin to a point. */
		adminTeleport: "adminTeleport"
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
	/** The admin panel on this client: opens it for admins (F10 or /aiadmin), relays edits and the server's deltas. */
	var AdminPanelClient = class {
		open = false;
		opening = false;
		async show() {
			if (this.open || this.opening || !isLoaded()) return;
			this.opening = true;
			const panels = await triggerServerCallback(ADMIN.openCallback).catch(() => null);
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
		name: "aicore_admin_F10",
		description: Locale("KEYBIND_ADMIN"),
		defaultKey: "F10",
		onPressed: () => void panel.show()
	});
	RegisterCommand("aiadmin", () => void panel.show(), false);
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
			name: "aicore_interact_E",
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

// resource/client/scene.ts
	const MODELS = {
		male: "mp_m_freemode_01",
		female: "mp_f_freemode_01"
	};
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
	* The character screen's world part: the player's own ped stands at the scene point (in a private bucket the
	* server set) with a scripted camera on it; the NUI draws on top.
	*/
	var SelectScene = class {
		camera = null;
		sex = null;
		async enter(ped, camera, fov) {
			DoScreenFadeOut(0);
			await this.preview("male");
			const self = PlayerPedId();
			RequestCollisionAtCoord(ped.x, ped.y, ped.z);
			NetworkResurrectLocalPlayer(ped.x, ped.y, ped.z, ped.heading, 0, false);
			SetEntityCoordsNoOffset(PlayerPedId(), ped.x, ped.y, ped.z, false, false, false);
			SetEntityHeading(PlayerPedId(), ped.heading);
			FreezeEntityPosition(self, true);
			SetEntityInvincible(PlayerPedId(), true);
			await waitForGround();
			if (this.camera === null) this.camera = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", camera.x, camera.y, camera.z, 0, 0, camera.heading, fov, false, 0);
			PointCamAtCoord(this.camera, ped.x, ped.y, ped.z + .3);
			SetCamActive(this.camera, true);
			RenderScriptCams(true, false, 0, true, true);
			DisplayRadar(false);
			ShutdownLoadingScreen();
			ShutdownLoadingScreenNui();
			DoScreenFadeIn(500);
		}
		/** Shows a ped of `sex` (a character's look comes later from the appearance integration). */
		async preview(sex) {
			if (this.sex === sex) return;
			this.sex = sex;
			await setPlayerModel(MODELS[sex]);
			FreezeEntityPosition(PlayerPedId(), true);
			SetEntityInvincible(PlayerPedId(), true);
		}
		leave() {
			if (this.camera !== null) {
				RenderScriptCams(false, false, 0, true, true);
				DestroyCam(this.camera, false);
				this.camera = null;
			}
			this.sex = null;
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
		screen = isRecord(answer) && Array.isArray(answer.characters) && isRecord(answer.scene) ? answer : null;
		return screen;
	}
	/** Puts the player on the character screen: scene, camera, NUI with focus. */
	async function openCharacters() {
		const data = await loadScreen();
		if (!data) return;
		await scene.enter(data.scene.ped, data.scene.camera, data.scene.fov);
		SetNuiFocus(true, true);
		SendNUIMessage({
			action: NuiMessage.openCharacters,
			data: {
				screen: data,
				texts: loadLocaleTexts(),
				portraits
			}
		});
	}
	function closeCharacters() {
		SetNuiFocus(false, false);
		SendNUIMessage({ action: NuiMessage.closeCharacters });
	}
	RegisterNuiCallback(NuiCallback.ready, (_data, cb) => cb(screen ? {
		screen,
		texts: loadLocaleTexts(),
		portraits
	} : null));
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
			cb(result.ok ? {
				ok: true,
				screen: await loadScreen()
			} : result);
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
