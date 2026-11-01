-- ai-lib for Lua resources: `shared_script '@ai-lib/init.lua'` in the fxmanifest (with `dependency 'ai-lib'`), then
-- `aiLib.notify(...)`, `aiLib.Points.new()`, `aiLib.addCommand(...)`. Modules load on first use, in the calling
-- resource's own context, so what a resource creates (points, keybinds, callbacks) goes with it.

-- A resource that carries a copy of ai-lib (ai-core's bridge, which starts before ai-lib) sets `AiLibResource` and
-- `AiLibRoot` before including its copy of this file.
local LIB = rawget(_G, 'AiLibResource') or 'ai-lib'
local ROOT = rawget(_G, 'AiLibRoot') or ''
local side = IsDuplicityVersion() and 'server' or 'client'

---Loads `lua/<side>/<name>.lua`, else `lua/shared/<name>.lua`, and returns what the file returns.
---@param name string
---@return any
local function loadModule(name)
    for _, dir in ipairs({ side, 'shared' }) do
        local path = ('%slua/%s/%s.lua'):format(ROOT, dir, name)
        local code = LoadResourceFile(LIB, path)
        if code then
            local chunk, err = load(code, ('@@%s/%s'):format(LIB, path), 't', _ENV)
            if not chunk then error(err, 2) end
            return chunk()
        end
    end
    error(('ai-lib has no "%s" on the %s'):format(name, side), 3)
end

---@class AiLib
---@field side 'client'|'server'
---@field waitFor fun(check: (fun(): any), timeout?: integer|false, interval?: integer): any
---@field every fun(ms: integer, fn: fun(), options?: { active?: boolean, name?: string }): AiLibJob periodic work (0 = every frame) on the resource's one scheduler thread; `job:set(active)`, `job:stop()`, `job.running`
---@field formatText fun(text: string, ...: string|number): string
---@field fail fun(error: string): { ok: false, error: string } server actions: a refusal with a lang key
---@field locale fun(resource?: string): (fun(key: string, ...: string|number): string), (table<string, string>)
---@field triggerServerCallback fun(name: string, args?: any[], timeout?: integer): (any), (string?) client
---@field onServerCallback fun(name: string, handler: (fun(...: any): any)) client
---@field callAction fun(name: string, args?: any[], options: { fallback: string, timeout?: integer, silent?: boolean }): table? client: runs an action, notifies the translated refusal, returns the ok reply or nil
---@field notify fun(...: any) client `(text, kind?, duration?, title?)`; server `(source, text, kind?, duration?, title?)`
---@field progress AiLibProgress client: `aiLib.progress(options)` waits (true = ran out), `progress.cancel()`, `progress.isRunning()`
---@field menu { show: (fun(request: table, listeners?: table): string?), input: (fun(request: table): table?), itemPicker: (fun(request: { title: string, target?: integer }): table?), skillCheck: (fun(difficulty: string|table, keys?: string[]): boolean), lockpick: (fun(options?: table): string) } client
---@field itemPicker fun(request: { title: string, target?: integer }): table? client, admin tools: the taken list or nil
---@field skillCheck fun(difficulty: string|table, keys?: string[]): boolean client: ai-core's skill check, waits (true = every stage hit)
---@field lockpick fun(options?: { difficulty?: string, pins?: integer, picks?: integer }): string client: ai-core's lockpick, waits ('opened' | 'broken' | 'cancelled')
---@field input fun(request: table): table? client
---@field showPrompt fun(id: string, text: string) client
---@field hidePrompt fun(id: string) client
---@field onPromptPressed fun(handler: (fun(id: string))) client
---@field cache AiLibCache client
---@field Keybind AiLibKeybind client
---@field Points AiLibPoints client
---@field ModelPoints table client, internal (used by `Points:addModel`)
---@field targets table client, internal: the target script adapters `Points` use (`lua/client/targets.lua`)
---@field Zones AiLibZones client
---@field LocalPed AiLibLocalPed client
---@field Blips AiLibBlips client (`Blips.create(options)` for a single blip)
---@field player table client: `coords`, `heading`, `distanceTo`, `freeze`, `teleport` (`ground = 'find'` or no z: ground under x / y), `playAnim`, `stopAnim`
---@field playerPed fun(serverId: integer): integer client: a player's ped by server id (`cache.ped` for the local one), 0 when out of scope
---@field waypoint fun(): { x: number, y: number }? client: the map waypoint
---@field nearestPlayer fun(metres: number, options?: { from?: vector3, filter?: fun(serverId: integer, ped: integer): boolean }): integer? client: closest other player's server id
---@field onShot fun(handler: fun(weapon: integer)) client: the frame the local ped fires (per-frame only while armed)
---@field fadeOut fun(ms?: integer) client
---@field fadeIn fun(ms?: integer) client
---@field waitForEntity fun(netId: integer, timeout?: integer): integer client: the entity once it exists here, 0 after the timeout
---@field nearestVehicle fun(metres: number, options?: { networked?: boolean, notOwn?: boolean, filter?: (fun(vehicle: integer): boolean), from?: vector3 }): integer, number? client: the vehicle (0 when none) and its distance
---@field nearestEntity fun(kind: 'ped'|'object'|'vehicle', from?: vector3, maxDistance?: number, options?: { filter?: (fun(entity: integer): boolean), ignoreLocal?: boolean }): integer, number? client: the closest entity of a pool (0 when none) and its distance
---@field entitiesInArea fun(kind: 'ped'|'object'|'vehicle', coords: vector3, radius: number): integer[] client
---@field isSpawnClear fun(coords: vector3, radius: number): boolean client: no vehicle within `radius`
---@field attachProp fun(model: string|integer, options: AiLibAttachPropOptions): integer client: a local prop held at a ped bone (0 on failure, waits; leftovers go when the resource stops)
---@field playerData { get: (fun(key: string): any), onChange: (fun(key: string, handler: fun(value: any))) } client
---@field onServerEvent fun(name: string, handler: (fun(...: any))) client
---@field onClientEvent fun(name: string, handler: (fun(source: integer, ...: any)), options?: table) server
---@field aiLog fun(channel: string, message: string, options?: table) server
---@field prison { jail: (fun(src: integer, minutes: integer, by?: integer): boolean), release: (fun(src: integer): boolean), timeLeft: (fun(src: integer): integer) } server: jail sentences through ai-core
---@field online table server: `character`, `name`, `jobs`, `gangs`, `jobGrade`, `gangGrade`, `dutyJob`, `sources`
---@field nearestVehicleTo fun(source: integer, metres: number, filter?: fun(vehicle: integer): boolean): integer server
---@field vehicleFromNet fun(netId: any): integer server: the live vehicle behind a client's net id, or 0
---@field vehicleNearPlayer fun(source: integer, netId: any, options?: { metres?: number, driver?: boolean }): integer server
---@field nearestPlayerTo fun(source: integer, metres: number, filter?: fun(other: integer): boolean): integer? server
---@field onCharacter fun(handlers: { loaded?: fun(source: integer, character: table), unloaded?: fun(source: integer, charId: integer, reason: 'dropped'|'switch') }) server: also replays characters loaded before a restart
---@field playersNearEntity fun(entity: integer, radius: number): integer[] server
---@field isAdmin fun(source: integer, ace?: string): boolean server
---@field controls { disable: (fun(reason: string, controls: integer[], group?: integer)), disableAll: (fun(reason: string, except?: integer[])), enable: (fun(reason: string)) } client
---@field hud { hide: (fun(reason: string)), show: (fun(reason: string)), visible: (fun(): boolean) } client
---@field keyHints { show: (fun(id: string, hint: { label: string, keybind?: string, key?: string, icon?: string })), hide: (fun(id: string)) } client
---@field gestures { isHandsUp: (fun(): boolean), isPointing: (fun(): boolean), provider: (fun(): string?), playEmote: (fun(name: string): boolean), cancelEmote: (fun(): boolean), emoteProvider: (fun(): string?) } client
---@field seatbelt { isOn: (fun(): boolean?), onChange: (fun(fn: fun(worn: boolean?))), provider: (fun(): string?) } client: the seat belt of whatever belt script runs
---@field stress { gain: (fun(source: integer, amount: number): boolean), relieve: (fun(source: integer, amount: number): boolean), provider: (fun(): string?) } server: stress through whatever HUD keeps it
---@field radial { add: (fun(item: AiLibRadialItem)), remove: (fun(id: string)), refresh: fun() } client: wheel items through ai-core
---@field requestModel fun(model: string|integer, timeout?: integer): integer? client
---@field requestAnimDict fun(dict: string, timeout?: integer): string? client
---@field requestAnimSet fun(set: string, timeout?: integer): string? client: a movement clipset
---@field requestTextureDict fun(dict: string, timeout?: integer): string? client
---@field requestScaleformMovie fun(name: string, timeout?: integer): integer client: the movie handle, 0 when it did not load
---@field requestWeaponAsset fun(weapon: string|integer, timeout?: integer): integer? client
---@field pedHeadshot fun(ped: integer, transparent?: boolean, timeout?: integer): (integer?), (string?) client: handle and txd once rendered
---@field locationName fun(coords?: vector3): { street: string, crossing: string?, zone: string } client
---@field vehicleLabel fun(vehicle: string|integer): string client: display name of a model name, hash or vehicle
---@field groundZ fun(x: number, y: number, z?: number): number? client: nil while the collision is not loaded
---@field numbers { round: (fun(value: number, decimals?: integer): number), groupDigits: (fun(value: number|string, separator?: string): string), headingTo: (fun(from: vector3, to: vector3): number) }
---@field stripGameText fun(text: any): string HTML tags and GTA codes removed
---@field raycast fun(from: vector3, to: vector3, options?: { flags?: integer, ignore?: integer, options?: integer }): { coords: vector3, normal: vector3, entity: integer }? client: a synchronous line probe
---@field RateLimit { new: fun(count: integer, windowMs: integer): AiLibRateLimit } server: per-player burst limit (`limit:take(source)`, `limit:release(source)`)
---@field requestPtfxAsset fun(asset: string, timeout?: integer): string? client
---@field onClientCallback fun(name: string, handler: (fun(source: integer, ...: any): any), options?: AiLibClientInputOptions) server
---@field triggerClientCallback fun(name: string, source: integer, args?: any[], timeout?: integer): (any), (string?) server
---@field progressFor fun(source: integer, options: table): boolean server: ai-lib's progress bar on the player's client, timed by the server (waits)
---@field minigameFor fun(source: integer, options: table): string server: ai-lib's minigame on the player's client ('won' | 'lost' | 'broken', waits)
---@field addCommand fun(name: string|string[], options: table, handler: (fun(source: integer, args: table, raw: string))) server
---@field spawnVehicle fun(options: AiLibSpawnVehicleOptions): integer? server
---@field vehicleType fun(model: string|integer, asker: integer): string?, integer server: the spawn type a player's client gives (kept once two players agree; waits) and the model hash
---@field playersNear fun(source: integer, radius: number): integer[] server
---@field playersNearCoords fun(coords: vector3, radius: number, bucket?: integer): integer[] server: loaded players near a point (walks every loaded player)
---@field inventory table client `openInventory`, `hasItem`, `currentWeapon`, `itemCount`, `itemDefinition`; server the item calls through ai-core (and `registerShop`, `openShop`, `setItemMetadata`, `setMaxWeight`, `usableItems`)
---@field vehicleKeys table server `give(source, vehicle, purpose?)`, `remove(source, vehicle)`, `has(source, vehicle)`; client `has(vehicle)` (entity or plate)
---@field phone table server
---@field dispatch { alert: (fun(alert: AiLibDispatchAlert): boolean) } server: police alerts through ai-core's alert system
---@field billing { send: (fun(bill: AiLibBill): boolean), unpaid: (fun(src: integer): table[]?), pay: (fun(src: integer, id: string): boolean), provider: (fun(): string?) } server: bills through ai-core (`unpaid` waits)
---@field banking { open: (fun(src: integer): boolean), societyBalance: (fun(job: string): number?), provider: (fun(): string?) } server: the banking script through ai-core
---@field mdt table client `open()`; server `record(record)`, `provider()`: police MDT through ai-core
---@field ems { available: (fun(jobs: string[]): integer), distress: (fun(src: integer, call: table): boolean), provider: (fun(): string?) } server: free medics and distress calls through ai-core
---@field world table client `pauseSync` / `resumeSync`; server time and weather
---@field appearance table client `apply(ped, look)`, `read(ped)`, `openMenu(menu)`, `wearOutfit(outfit)`, `reloadSkin()`; server `get(charId)` (waits), `provider()`: looks through ai-core's appearance layer
---@diagnostic disable-next-line: lowercase-global
aiLib = setmetatable({ side = side }, {
    __index = function(self, key)
        local value = loadModule(key)
        rawset(self, key, value)
        return value
    end,
})
