---The player's phone through ai-core (first running phone: tgiann-phone, lb-phone); answers nil / false without one.
local core = exports['ai-core']
return {
    number = function(src) return core:GetPhoneNumber(src) end,
    sourceOf = function(number) return core:GetSourceByPhone(number) end,
    hasPhone = function(src) return core:HasPhone(src) end,
    ---@param mail { sender: string, subject: string, message: string }
    mail = function(to, mail) return core:SendPhoneMail(to, mail) end,
    message = function(from, to, text) return core:SendPhoneMessage(from, to, text) end,
    ---@param notification { title: string, message: string, app?: string }
    notify = function(src, notification) return core:PhoneNotify(src, notification) end,
    ---`fn(src, phone)` when a player with a loaded character opens the phone (`phone`: the phone's resource name);
    ---once per opening, at most once per 10 s per player.
    ---@param fn fun(src: integer, phone: string)
    onUsed = function(fn)
        AddEventHandler('ai-core:phoneUsed', function(src, phone)
            if type(src) == 'number' and type(phone) == 'string' then fn(src, phone) end
        end)
    end,
}
