-- qb-core's version and database info.

--- The qb-core version whose API the bridge answers.
---@return string
function QBCore.Functions.GetCoreVersion() return '1.3.0' end

--- qb-core's database info from the `mysql_connection_string` convar (only the database name).
---@return { exists: boolean, database: string }
function QBCore.Functions.GetDatabaseInfo()
    local details = { exists = false, database = '' }
    local connection = GetConvar('mysql_connection_string', '')
    if connection == '' then return details end
    if connection:find('mysql://') then
        local rest = connection:sub(9, -1)
        details.database = (rest:sub((rest:find('/') or #rest) + 1, -1):gsub('[%?]+[%w%p]*$', ''))
        details.exists = details.database ~= ''
        return details
    end
    for part in connection:gmatch('[^;]+') do
        local name = part:match('^%s*[Dd]atabase%s*=%s*(.-)%s*$')
        if name then
            details.database, details.exists = name, true
            return details
        end
    end
    return details
end
