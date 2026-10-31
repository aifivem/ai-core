-- From vRP (https://github.com/vRP-framework/vRP), MIT license, Copyright (c) 2017 ImagicTheCat (full notice in vRPShared.lua).
-- vRP 1.0 lib/Tools.lua (ID generator), unchanged.

-- this file define some useful tools

local Tools = {}

-- ID generator

local IDGenerator = {}

function Tools.newIDGenerator()
  local r = setmetatable({}, { __index = IDGenerator })
  r:construct()
  return r
end

function IDGenerator:construct()
  self:clear()
end

function IDGenerator:clear()
  self.max = 0
  self.ids = {}
end

-- return a new id
function IDGenerator:gen()
  if #self.ids > 0 then
    return table.remove(self.ids)
  else
    local r = self.max
    self.max = self.max+1
    return r
  end
end

-- free a previously generated id
function IDGenerator:free(id)
  table.insert(self.ids,id)
end

-- USEFUL FUNCTIONS

return Tools
